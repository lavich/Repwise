"""Builds public/models/mannequin.glb from Mesh2Motion sources.

Usage: blender -b --factory-startup -P build_mannequin.py -- <sources dir> <output.glb> [preview dir]
"""
import colorsys
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from exercise_poses import POSES, STEP as STEP_HEIGHT  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
SOURCES, OUTPUT = Path(args[0]), Path(args[1])
PREVIEW = Path(args[2]) if len(args) > 2 else None

MUSCLE_IDS = [
    'chest', 'front-delts', 'side-delts', 'biceps', 'triceps', 'abs', 'obliques', 'lats',
    'upper-back', 'lower-back', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves',
]
FRAMES = 30
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


def add_ik(pose_bone, target, pole):
    constraint = pose_bone.constraints.new('IK')
    constraint.target = target
    constraint.pole_target = pole
    constraint.pole_angle = math.radians(-90)
    constraint.chain_count = 2


AXES = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}


def rest_rotation(pose_bone, axis, degrees):
    """Rotation of a bone about an axis of the rest pose, relative to its parent."""
    local = pose_bone.bone.matrix_local.to_3x3().inverted() @ AXES[axis]
    return Quaternion(local, math.radians(degrees))


def turn(pose_bone, axis, degrees):
    pose_bone.rotation_mode = 'QUATERNION'
    pose_bone.rotation_quaternion = rest_rotation(pose_bone, axis, degrees) @ pose_bone.rotation_quaternion


def lower_arms(pose):
    for side, sign in (('l', 1), ('r', -1)):
        turn(pose[f'upperarm_{side}'], 'Y', 72 * sign)
        turn(pose[f'lowerarm_{side}'], 'Y', 8 * sign)


def grip(pose, curl=None):
    for side, sign in (('l', 1), ('r', -1)):
        for finger, angle in (('index', 80), ('middle', 85), ('ring', 85), ('pinky', 80), ('thumb', 60)):
            for joint in ('01', '02', '03'):
                turn(pose[f'{finger}_{joint}_{side}'], 'Y', (curl or angle) * sign)


def resolve(armature, spec):
    kind = spec[0]
    if kind == 'at':
        return Vector(spec[1])
    if kind == 'from':
        return armature.matrix_world @ armature.pose.bones[spec[1]].head + Vector(spec[2])
    raise ValueError(kind)


def set_state(armature, spec, state):
    pose = armature.pose.bones
    for pose_bone in pose:
        pose_bone.matrix_basis = Matrix.Identity(4)
        pose_bone.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()
    location, rotation = state.get('root', (Vector((0, 0, 0)), (0, 0, 0)))
    euler = Euler([math.radians(a) for a in rotation])
    root = pose['root']
    root.matrix = Matrix.Translation(location) @ euler.to_matrix().to_4x4() @ root.bone.matrix_local
    bpy.context.view_layer.update()
    for name, (axis, degrees) in {**state.get('bend', {}), **state.get('fk', {})}.items():
        turn(pose[name], axis, degrees)
    if spec.get('arms_down'):
        lower_arms(pose)
    grip(pose, None if spec.get('grip') else 15)
    bpy.context.view_layer.update()


def build_clip(armature, name, spec):
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    pose = armature.pose.bones
    helpers = []
    animated = []
    for chain, limb in spec.get('ik', {}).items():
        target_spec, pole_spec = limb['target'], limb['pole']
        objects = []
        for kind, specs in (('target', target_spec), ('pole', pole_spec)):
            if specs[0][0] == 'on':
                obj = empty(f'{name}_{chain}_{kind}', Vector(specs[0][2]), armature, specs[0][1])
            else:
                obj = empty(f'{name}_{chain}_{kind}', Vector((0, 0, 0)))
                animated.append((obj, specs))
            objects.append(obj)
        add_ik(pose[chain], *objects)
        helpers += objects
        if 'foot' in limb:
            foot = pose[chain.replace('calf', 'foot')]
            anchor = empty(f'{name}_{chain}_anchor', Vector((0, 0, 0)))
            anchor.rotation_mode = 'QUATERNION'
            rest = (armature.matrix_world @ foot.bone.matrix_local).to_quaternion()
            constraint = foot.constraints.new('COPY_ROTATION')
            constraint.target = anchor
            animated.append((anchor, ('pitch', rest, limb['foot'])))
            helpers.append(anchor)

    for frame, key in ((0, 'start'), (FRAMES, 'end')):
        index = 0 if key == 'start' else 1
        set_state(armature, spec, spec[key])
        for obj, specs in animated:
            if specs[0] == 'pitch':
                _, rest, pitches = specs
                obj.rotation_quaternion = Quaternion(Vector((1, 0, 0)), math.radians(pitches[index])) @ rest
                obj.keyframe_insert('rotation_quaternion', frame=frame)
            else:
                obj.location = resolve(armature, specs[index])
                obj.keyframe_insert('location', frame=frame)
        for pose_bone in pose:
            pose_bone.keyframe_insert('location', frame=frame)
            pose_bone.keyframe_insert('rotation_quaternion', frame=frame)

    keyed = armature.animation_data.action
    bpy.ops.nla.bake(
        frame_start=0,
        frame_end=FRAMES,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        use_current_action=False,
        bake_types={'POSE'},
    )
    action = armature.animation_data.action
    action.name = name
    action.use_fake_user = True
    bpy.data.actions.remove(keyed)
    for obj in helpers:
        if obj.animation_data and obj.animation_data.action:
            bpy.data.actions.remove(obj.animation_data.action)
        bpy.data.objects.remove(obj)
    check_clip(armature, name, spec)
    armature.animation_data.action = None
    for pose_bone in pose:
        pose_bone.matrix_basis = Matrix.Identity(4)
    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def check_clip(armature, name, spec):
    pose = armature.pose.bones
    fixed = {}
    for frame in range(FRAMES + 1):
        bpy.context.scene.frame_set(frame)
        for bone in spec.get('contacts', []):
            point = armature.matrix_world @ pose[bone].head
            if (point - fixed.setdefault(bone, point.copy())).length > spec.get('tolerance', 0.003):
                raise RuntimeError(f'{name}: {bone} moves at frame {frame}')
        limit = spec.get('elbows_out')
        if limit:
            for side, sign in (('l', 1), ('r', -1)):
                elbow = armature.matrix_world @ pose[f'lowerarm_{side}'].head
                if elbow.x * sign < limit:
                    raise RuntimeError(f'{name}: elbow_{side} is inside the torso at frame {frame}')


def build_stand(armature):
    action = bpy.data.actions.new('stand')
    action.use_fake_user = True
    armature.animation_data.action = action
    pose = armature.pose.bones
    set_state(armature, {'arms_down': True}, {})
    for frame in (0, 1):
        for pose_bone in pose:
            pose_bone.keyframe_insert('rotation_quaternion', frame=frame)
    armature.animation_data.action = None
    for pose_bone in pose:
        pose_bone.matrix_basis = Matrix.Identity(4)
    return action


def add_props():
    props = []
    for name, size, location in (
        ('prop_bench', (0.6, 0.35, 0.42), (0, 0.62, 0.21)),
        ('prop_step', (0.4, 0.32, STEP_HEIGHT), (0.089, -0.06, STEP_HEIGHT / 2)),
    ):
        bpy.ops.mesh.primitive_cube_add(size=1, location=location)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = size
        bpy.ops.object.transform_apply(scale=True)
        props.append(obj)
    return props


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


def use_action(armature, action):
    armature.animation_data.action = action
    if action and action.slots:
        armature.animation_data.action_slot = action.slots[0]


def render_previews(armature, mesh, clips, stand, props):
    PREVIEW.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.render.resolution_x, scene.render.resolution_y = 400, 400
    camera_data = bpy.data.cameras.new('camera')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.4
    camera = bpy.data.objects.new('camera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    def shoot(name, location, rotation):
        camera.location = location
        camera.rotation_euler = [math.radians(v) for v in rotation]
        scene.render.filepath = str(PREVIEW / f'{name}.png')
        bpy.ops.render.render(write_still=True)

    scene.display.shading.color_type = 'SINGLE'
    for name, action in clips.items():
        used = POSES.get(name, {}).get('props', [])
        for prop in props:
            prop.hide_render = prop.name not in used
        use_action(armature, action)
        end = 23 if name == 'pushup' else FRAMES
        for frame in (0, end // 2, end):
            scene.frame_set(frame)
            shoot(f'{name}-side-{frame}', (3.5, 0.3, 0.7), (90, 0, 90))
            shoot(f'{name}-front-{frame}', (2.4, -2.4, 0.9), (82, 0, 45))
    for prop in props:
        prop.hide_render = True

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


def export(armature, mesh, actions, props):
    for action in actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        track.strips.new(action.name, 0, action)
    armature.animation_data.action = None
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    mesh.select_set(True)
    for prop in props:
        prop.select_set(True)
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
clips = {'pushup': pushup}
only = set(filter(None, __import__('os').environ.get('CLIPS', '').split(',')))
for clip_name, clip_spec in POSES.items():
    if not only or clip_name in only:
        clips[clip_name] = build_clip(armature, clip_name, clip_spec)
stand = build_stand(armature)
props = add_props()
mark_muscles(armature, mesh)
if PREVIEW:
    render_previews(armature, mesh, clips, stand, props)
export(armature, mesh, [*clips.values(), stand], props)
print('EXPORTED', OUTPUT, OUTPUT.stat().st_size)
