"""Builds public/models/mannequin.glb from Mesh2Motion sources.

Usage: blender -b --factory-startup -P build_mannequin.py -- <sources dir> <output.glb> [preview dir]
"""
import colorsys
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

args = sys.argv[sys.argv.index('--') + 1:]
SOURCES, OUTPUT = Path(args[0]), Path(args[1])
PREVIEW = Path(args[2]) if len(args) > 2 else None

MUSCLE_IDS = [
    'chest', 'front-delts', 'side-delts', 'biceps', 'triceps', 'abs', 'obliques', 'lats',
    'upper-back', 'lower-back', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves',
]
SQUAT_FRAMES = 30
# Distance of the shoulder joints from the midline in the rest pose.
SHOULDER_X = 0.174


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.data.objects if o not in before]


def load_model():
    objects = import_glb(SOURCES / 'model.glb')
    armature = next(o for o in objects if o.type == 'ARMATURE')
    mesh = next(o for o in objects if o.type == 'MESH' and o.parent == armature)
    for o in objects:
        if o not in (armature, mesh):
            bpy.data.objects.remove(o)
    return armature, mesh


def load_pushup(armature):
    for o in import_glb(SOURCES / 'pushup.glb'):
        bpy.data.objects.remove(o)
    action = bpy.data.actions['Pushup']
    action.name = 'pushup'
    action.use_fake_user = True
    return action


def empty(name, location, parent=None, bone=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    if parent:
        obj.parent = parent
        if bone:
            obj.parent_type = 'BONE'
            obj.parent_bone = bone
        bpy.context.view_layer.update()
        obj.matrix_world = Matrix.Translation(location)
    return obj


def head_world(armature, bone):
    return armature.matrix_world @ armature.data.bones[bone].head_local


def add_ik(pose_bone, target, pole, chain=2, pole_angle=0.0):
    constraint = pose_bone.constraints.new('IK')
    constraint.target = target
    constraint.pole_target = pole
    constraint.pole_angle = pole_angle
    constraint.chain_count = chain
    return constraint


def rotate_about_head(armature, name, axis, degrees):
    pose_bone = armature.pose.bones[name]
    head = pose_bone.head.copy()
    rotation = Matrix.Rotation(math.radians(degrees), 4, axis)
    pose_bone.matrix = Matrix.Translation(head) @ rotation @ Matrix.Translation(-head) @ pose_bone.matrix
    bpy.context.view_layer.update()


def check_squat(armature):
    pose = armature.pose.bones
    feet = {}
    for frame in range(SQUAT_FRAMES + 1):
        bpy.context.scene.frame_set(frame)
        for side, sign in (('l', 1), ('r', -1)):
            foot = armature.matrix_world @ pose[f'foot_{side}'].head
            if (foot - feet.setdefault(side, foot.copy())).length > 0.002:
                raise RuntimeError(f'foot_{side} moves at frame {frame}')
            elbow = armature.matrix_world @ pose[f'lowerarm_{side}'].head
            shoulder = armature.matrix_world @ pose[f'upperarm_{side}'].head
            if elbow.x * sign < 0.25 or elbow.z > shoulder.z:
                raise RuntimeError(f'elbow_{side} is inside the torso or above the shoulder at frame {frame}')


def build_squat(armature):
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    pose = armature.pose.bones
    targets = []
    for side, sign in (('l', 1), ('r', -1)):
        foot = head_world(armature, f'foot_{side}')
        foot_target = empty(f'foot_target_{side}', foot)
        knee_pole = empty(f'knee_pole_{side}', foot + Vector((0.12 * sign, -0.6, 0.45)))
        add_ik(pose[f'calf_{side}'], foot_target, knee_pole, pole_angle=math.radians(-90))
        flat = pose[f'foot_{side}'].constraints.new('COPY_ROTATION')
        anchor = empty(f'foot_anchor_{side}', foot)
        anchor.rotation_mode = 'QUATERNION'
        anchor.rotation_quaternion = (armature.matrix_world @ armature.data.bones[f'foot_{side}'].matrix_local).to_quaternion()
        flat.target = anchor
        shoulder = head_world(armature, f'upperarm_{side}')
        hand_target = empty(f'hand_target_{side}', shoulder + Vector((0.02 * sign, -0.12, -0.02)), armature, 'spine_03')
        elbow_pole = empty(f'elbow_pole_{side}', shoulder + Vector((0.22 * sign, -0.45, -0.5)), armature, 'spine_03')
        add_ik(pose[f'lowerarm_{side}'], hand_target, elbow_pole, pole_angle=math.radians(-90))
        targets += [foot_target, knee_pole, anchor, hand_target, elbow_pole]

    def key_pose(frame, drop, back, lean):
        for pose_bone in pose:
            pose_bone.location = (0, 0, 0)
            pose_bone.rotation_mode = 'QUATERNION'
            pose_bone.rotation_quaternion = (1, 0, 0, 0)
        bpy.context.view_layer.update()
        root = pose['root']
        root.matrix = Matrix.Translation((0, back, -drop)) @ root.matrix
        bpy.context.view_layer.update()
        rotate_about_head(armature, 'pelvis', 'X', lean * 0.6)
        rotate_about_head(armature, 'spine_02', 'X', lean * 0.4)
        rotate_about_head(armature, 'neck_01', 'X', -lean * 0.8)
        for name in ('root', 'pelvis', 'spine_02', 'neck_01'):
            pose[name].keyframe_insert('location', frame=frame)
            pose[name].keyframe_insert('rotation_quaternion', frame=frame)
        grip_band(frame)

    # Fingers close into a fist around the band. The curl axis is the model's
    # forward axis expressed in each finger bone's rest frame.
    def grip_band(frame):
        forward = Vector((0, 1, 0))
        for side, sign in (('l', 1), ('r', -1)):
            for finger, angle in (('index', 80), ('middle', 85), ('ring', 85), ('pinky', 80), ('thumb', 60)):
                for joint in ('01', '02', '03'):
                    pose_bone = pose[f'{finger}_{joint}_{side}']
                    axis = pose_bone.bone.matrix_local.to_3x3().inverted() @ forward
                    pose_bone.rotation_mode = 'QUATERNION'
                    pose_bone.rotation_quaternion = Quaternion(axis, math.radians(angle * sign))
                    pose_bone.keyframe_insert('rotation_quaternion', frame=frame)

    key_pose(0, 0.0, 0.0, 0.0)
    key_pose(SQUAT_FRAMES, 0.42, 0.16, 32.0)
    driver_action = armature.animation_data.action
    bpy.ops.nla.bake(
        frame_start=0,
        frame_end=SQUAT_FRAMES,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        use_current_action=False,
        bake_types={'POSE'},
    )
    squat = armature.animation_data.action
    squat.name = 'band-squat'
    check_squat(armature)
    squat.use_fake_user = True
    bpy.data.actions.remove(driver_action)
    for obj in targets:
        bpy.data.objects.remove(obj)
    bpy.ops.object.mode_set(mode='OBJECT')
    return squat


def rotate_about_forward(pose_bone, degrees):
    forward = Vector((0, 1, 0))
    axis = pose_bone.bone.matrix_local.to_3x3().inverted() @ forward
    pose_bone.rotation_mode = 'QUATERNION'
    pose_bone.rotation_quaternion = Quaternion(axis, math.radians(degrees))


# A relaxed standing pose for the muscle map: arms lowered from the T-pose.
def build_stand(armature):
    action = bpy.data.actions.new('stand')
    action.use_fake_user = True
    armature.animation_data.action = action
    pose = armature.pose.bones
    for pose_bone in pose:
        pose_bone.matrix_basis = Matrix.Identity(4)
    for side, sign in (('l', 1), ('r', -1)):
        rotate_about_forward(pose[f'upperarm_{side}'], 72 * sign)
        rotate_about_forward(pose[f'lowerarm_{side}'], 8 * sign)
        for finger in ('index', 'middle', 'ring', 'pinky'):
            for joint in ('01', '02', '03'):
                rotate_about_forward(pose[f'{finger}_{joint}_{side}'], 15 * sign)
    for frame in (0, 1):
        for pose_bone in pose:
            pose_bone.keyframe_insert('rotation_quaternion', frame=frame)
    armature.animation_data.action = None
    for pose_bone in pose:
        pose_bone.matrix_basis = Matrix.Identity(4)
    return action


# The mannequin faces -Y and its left side is +X; groups follow the dominant
# bone of a vertex and which way its surface faces in the rest pose.
def classify(bone, normal, position, forward):
    side_x = position.x
    facing = normal.dot(forward)
    outward = normal.x * (1 if side_x >= 0 else -1)
    base = bone.rsplit('_', 1)[0] if bone.endswith(('_l', '_r')) else bone
    if base == 'thigh':
        # The lower half of the buttocks is skinned to the thigh bones.
        if facing < -0.2 and position.z > 0.8:
            return 'glutes'
        if outward < -0.45:
            return 'adductors'
        return 'quads' if facing > 0 else 'hamstrings'
    if base == 'calf':
        return 'calves' if facing < -0.2 else None
    if base == 'pelvis':
        return 'glutes' if facing < -0.1 and position.z < 1.0 else None
    if base == 'spine_01':
        if facing > 0.2:
            return 'abs' if abs(side_x) < 0.07 else 'obliques'
        if facing < -0.2:
            return 'lower-back'
        return 'obliques'
    if base in ('spine_02', 'spine_03'):
        if facing > 0.2:
            if position.z > 1.24:
                return 'chest' if abs(side_x) < SHOULDER_X - 0.05 else 'front-delts'
            return 'abs' if abs(side_x) < 0.07 else 'obliques'
        if facing < -0.2:
            return 'upper-back' if abs(side_x) < 0.09 or position.z > 1.36 else 'lats'
        return 'lats' if position.z > 1.12 else 'obliques'
    if base == 'clavicle':
        if facing > 0.3:
            return 'chest' if abs(side_x) < SHOULDER_X - 0.05 else 'front-delts'
        return 'upper-back' if facing < -0.3 else 'side-delts'
    if base == 'upperarm':
        along = position.x * (1 if side_x >= 0 else -1)
        if along < 0.25:
            if facing > 0.3:
                return 'front-delts'
            if facing < -0.3:
                return 'upper-back'
            return 'side-delts'
        if facing > 0.2 or (normal.z > 0.5 and facing > -0.2):
            return 'biceps'
        return 'triceps'
    return None


def mark_muscles(armature, mesh):
    forward = Vector((0, -1, 0))
    groups = {g.index: g.name for g in mesh.vertex_groups}
    attribute = mesh.data.attributes.new('_MUSCLE', 'FLOAT', 'POINT')
    counts = {}
    for vertex in mesh.data.vertices:
        weights = [(g.weight, groups[g.group]) for g in vertex.groups if g.weight > 0]
        bone = max(weights)[1] if weights else ''
        normal = (mesh.matrix_world.to_3x3() @ vertex.normal).normalized()
        muscle = classify(bone, normal, mesh.matrix_world @ vertex.co, forward)
        value = MUSCLE_IDS.index(muscle) + 1 if muscle else 0
        attribute.data[vertex.index].value = float(value)
        counts[muscle] = counts.get(muscle, 0) + 1
    print('MUSCLE COUNTS', counts)


def render_previews(armature, mesh, squat, pushup, stand):
    PREVIEW.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.render.resolution_x, scene.render.resolution_y = 400, 400
    camera_data = bpy.data.cameras.new('camera')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.3
    camera = bpy.data.objects.new('camera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    def shoot(name, location, rotation):
        camera.location = location
        camera.rotation_euler = [math.radians(v) for v in rotation]
        scene.render.filepath = str(PREVIEW / f'{name}.png')
        bpy.ops.render.render(write_still=True)

    armature.animation_data.action = squat
    if squat.slots:
        armature.animation_data.action_slot = squat.slots[0]
    scene.display.shading.color_type = 'SINGLE'
    for frame in (0, SQUAT_FRAMES // 2, SQUAT_FRAMES):
        scene.frame_set(frame)
        shoot(f'squat-side-{frame}', (3.5, 0, 0.85), (90, 0, 90))
        shoot(f'squat-front-{frame}', (0, -3.5, 0.85), (90, 0, 0))
    armature.animation_data.action = pushup
    if pushup.slots:
        armature.animation_data.action_slot = pushup.slots[0]
    for frame in (0, 12, 23):
        scene.frame_set(frame)
        shoot(f'pushup-side-{frame}', (3.5, 0, 0.6), (90, 0, 90))

    armature.animation_data.action = stand
    if stand.slots:
        armature.animation_data.action_slot = stand.slots[0]
    scene.frame_set(0)
    shoot('stand-front', (0, -3.5, 0.9), (90, 0, 0))
    armature.animation_data.action = None
    for pose_bone in armature.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
    scene.frame_set(0)
    palette = [(0.25, 0.25, 0.25, 1)] + [(*colorsys.hsv_to_rgb(i / 15, 0.75, 0.95), 1) for i in range(15)]
    colors = mesh.data.color_attributes.new('preview', 'FLOAT_COLOR', 'POINT')
    values = mesh.data.attributes['_MUSCLE'].data
    for i, item in enumerate(colors.data):
        item.color = palette[int(values[i].value)]
    scene.display.shading.color_type = 'VERTEX'
    shoot('muscles-front', (0, -3.5, 0.9), (90, 0, 0))
    shoot('muscles-back', (0, 3.5, 0.9), (90, 0, 180))
    shoot('muscles-side', (3.5, 0, 0.9), (90, 0, 90))
    highlight_sets = {
        'squat': (['quads', 'glutes'], ['adductors', 'lower-back']),
        'pushup': (['chest', 'triceps'], ['front-delts', 'abs']),
    }
    for name, (primary, secondary) in highlight_sets.items():
        for i, item in enumerate(colors.data):
            index = int(values[i].value)
            muscle = MUSCLE_IDS[index - 1] if index else None
            item.color = (0.86, 0.98, 0.35, 1) if muscle in primary else (0.42, 0.55, 0.16, 1) if muscle in secondary else (0.3, 0.32, 0.3, 1)
        shoot(f'hl-{name}-front', (0, -3.5, 0.9), (90, 0, 0))
        shoot(f'hl-{name}-back', (0, 3.5, 0.9), (90, 0, 180))
    mesh.data.color_attributes.remove(colors)


def export(armature, mesh, actions):
    for action in actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        track.strips.new(action.name, 0, action)
    armature.animation_data.action = None
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    mesh.select_set(True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format='GLB',
        use_selection=True,
        export_attributes=True,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_materials='NONE',
        export_texcoords=False,
        export_morph=False,
    )


reset_scene()
armature, mesh = load_model()
pushup = load_pushup(armature)
armature.animation_data_create()
squat = build_squat(armature)
stand = build_stand(armature)
mark_muscles(armature, mesh)
if PREVIEW:
    render_previews(armature, mesh, squat, pushup, stand)
export(armature, mesh, [pushup, squat, stand])
print('EXPORTED', OUTPUT, OUTPUT.stat().st_size)
