"""Start and end positions of every exercise clip built in Blender.

Coordinates are metres in the rest pose of the Mesh2Motion mannequin: it faces
-Y, its left side is +X and the floor is z = 0. Rotations are degrees about an
axis of the rest pose; a bone bends relative to its parent.

Targets for IK limbs:
- ('at', point): a fixed point in the world (feet on the floor),
- ('from', bone, offset): offset from the bone's posed head at that frame,
- ('on', bone, point): attached to the bone, so it follows it (hands at the shoulders).
"""

import math

from mathutils import Matrix, Vector

SHOULDER = {'l': Vector((0.174, 0.065, 1.446)), 'r': Vector((-0.174, 0.065, 1.446))}
ANKLE = {'l': Vector((0.089, 0.048, 0.098)), 'r': Vector((-0.089, 0.048, 0.098))}
BALL = {'l': Vector((0.089, -0.113, 0.015)), 'r': Vector((-0.089, -0.113, 0.015))}
SIDES = (('l', 1), ('r', -1))
SUPINE = (-90, 0, 0)


def v(x, y, z):
    return Vector((x, y, z))


def planted_feet(pole_forward=0.6, pole_up=0.45, spread=0.12):
    return {
        f'calf_{side}': {
            'target': (('at', ANKLE[side]), ('at', ANKLE[side])),
            'pole': (('at', ANKLE[side] + v(spread * s, -pole_forward, pole_up)),) * 2,
            'foot': (0, 0),
        }
        for side, s in SIDES
    }


def hands(start, end, pole_start, pole_end=None):
    return {
        f'lowerarm_{side}': {
            'target': (start(side, s), end(side, s)),
            'pole': (pole_start(side, s), (pole_end or pole_start)(side, s)),
        }
        for side, s in SIDES
    }


def heel_raise(degrees):
    """Ankle position after raising the heel by rotating the foot about the ball."""
    rotation = Matrix.Rotation(math.radians(degrees), 3, 'X')
    return BALL['l'] + rotation @ (ANKLE['l'] - BALL['l'])


STEP = 0.10
RAISED_ANKLE = heel_raise(25) + v(0, 0, STEP)
STANDING_ANKLE = ANKLE['l'] + v(0, 0, STEP)

POSES = {
    'band-squat': {
        'start': {},
        'end': {'root': (v(0, 0.16, -0.42), (0, 0, 0)), 'bend': {'pelvis': ('X', 19.2), 'spine_02': ('X', 12.8), 'neck_01': ('X', -25.6)}},
        'ik': {
            **planted_feet(),
            **hands(
                lambda side, s: ('on', 'spine_03', SHOULDER[side] + v(0.02 * s, -0.12, -0.02)),
                lambda side, s: ('on', 'spine_03', SHOULDER[side] + v(0.02 * s, -0.12, -0.02)),
                lambda side, s: ('on', 'spine_03', SHOULDER[side] + v(0.22 * s, -0.45, -0.5)),
            ),
        },
        'grip': True,
        'contacts': ['foot_l', 'foot_r'],
        'elbows_out': 0.25,
    },
    'seated-band-row': {
        'start': {'root': (v(0, 0, -0.8), (0, 0, 0)), 'bend': {'pelvis': ('X', 15)}},
        'end': {'root': (v(0, 0, -0.8), (0, 0, 0)), 'bend': {'pelvis': ('X', -8)}},
        'ik': {
            **{
                f'calf_{side}': {
                    'target': (('at', v(0.12 * s, -0.78, 0.09)),) * 2,
                    'pole': (('at', v(0.12 * s, -0.45, 0.9)),) * 2,
                    'foot': (-70, -70),
                }
                for side, s in SIDES
            },
            **hands(
                lambda side, s: ('from', f'upperarm_{side}', v(0.02 * s, -0.52, -0.18)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.02 * s, -0.16, -0.38)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.25 * s, 0.1, -0.45)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.12 * s, 0.45, -0.25)),
            ),
        },
        'grip': True,
        'contacts': ['foot_l', 'foot_r'],
    },
    'band-romanian-deadlift': {
        'start': {},
        'end': {'root': (v(0, 0.14, -0.02), (0, 0, 0)), 'bend': {'pelvis': ('X', 55), 'spine_02': ('X', 20), 'neck_01': ('X', -30)}},
        'ik': {
            **planted_feet(pole_forward=0.6, pole_up=0.4, spread=0.1),
            **hands(
                lambda side, s: ('from', f'upperarm_{side}', v(0.03 * s, -0.06, -0.55)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.0, -0.06, -0.56)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.15 * s, 0.35, -0.3)),
            ),
        },
        'grip': True,
        'contacts': ['foot_l', 'foot_r'],
    },
    'band-overhead-press': {
        'start': {},
        'end': {},
        'ik': hands(
            lambda side, s: ('at', SHOULDER[side] + v(0.10 * s, -0.15, 0.05)),
            lambda side, s: ('at', v(0.22 * s, 0.0, 1.99)),
            lambda side, s: ('at', SHOULDER[side] + v(0.45 * s, -0.1, -0.35)),
            lambda side, s: ('at', SHOULDER[side] + v(0.55 * s, 0.05, 0.1)),
        ),
        'grip': True,
        'elbows_out': 0.2,
    },
    'band-biceps-curl': {
        'start': {},
        'end': {},
        'ik': hands(
            lambda side, s: ('at', v(0.22 * s, -0.04, 0.90)),
            lambda side, s: ('at', v(0.21 * s, -0.20, 1.34)),
            lambda side, s: ('at', v(0.26 * s, 0.40, 1.15)),
        ),
        'grip': True,
    },
    'calf-raise': {
        'start': {'root': (v(0, 0, STEP), (0, 0, 0)), 'fk': {'thigh_r': ('X', -10), 'calf_r': ('X', 80)}},
        'end': {
            'root': (v(0, RAISED_ANKLE.y - STANDING_ANKLE.y, RAISED_ANKLE.z - ANKLE['l'].z), (0, 0, 0)),
            'fk': {'thigh_r': ('X', -10), 'calf_r': ('X', 80)},
        },
        'ik': {
            'calf_l': {
                'target': (('at', STANDING_ANKLE), ('at', RAISED_ANKLE)),
                'pole': (('at', ANKLE['l'] + v(0.1, -0.6, 0.5)),) * 2,
                'foot': (0, 25),
            },
        },
        'arms_down': True,
        'props': ['prop_step'],
        'contacts': ['ball_l'],
        # The heel moves along a straight line between the frames rather than an
        # arc around the ball, which shifts the ball by up to ~4 mm mid-movement.
        'tolerance': 0.006,
    },
    'reverse-crunch': {
        'start': {
            'root': (v(0, 0, 0.11), SUPINE),
            'fk': {'thigh_l': ('X', -90), 'thigh_r': ('X', -90), 'calf_l': ('X', 90), 'calf_r': ('X', 90)},
        },
        'end': {
            'root': (v(0, 0, 0.11), SUPINE),
            'bend': {'pelvis': ('X', -30), 'spine_01': ('X', 30)},
            'fk': {'thigh_l': ('X', -110), 'thigh_r': ('X', -110), 'calf_l': ('X', 90), 'calf_r': ('X', 90)},
        },
        'arms_down': True,
    },
    'bulgarian-split-squat': {
        'start': {'root': (v(0, 0.05, -0.07), (0, 0, 0))},
        'end': {'root': (v(0, 0.10, -0.40), (0, 0, 0)), 'bend': {'pelvis': ('X', 10)}},
        'ik': {
            'calf_l': {
                'target': (('at', v(0.11, -0.30, 0.098)),) * 2,
                'pole': (('at', v(0.15, -0.9, 0.5)),) * 2,
                'foot': (0, 0),
            },
            'calf_r': {
                'target': (('at', v(-0.11, 0.55, 0.45)),) * 2,
                'pole': (('at', v(-0.12, 0.15, -0.4)),) * 2,
                'foot': (80, 80),
            },
        },
        'arms_down': True,
        'props': ['prop_bench'],
        'contacts': ['foot_l', 'foot_r'],
    },
    'bent-over-band-row': {
        'start': {'root': (v(0, 0.12, -0.05), (0, 0, 0)), 'bend': {'pelvis': ('X', 40), 'spine_02': ('X', 15), 'neck_01': ('X', -35)}},
        'end': {'root': (v(0, 0.12, -0.05), (0, 0, 0)), 'bend': {'pelvis': ('X', 40), 'spine_02': ('X', 15), 'neck_01': ('X', -35)}},
        'ik': {
            **planted_feet(pole_forward=0.6, pole_up=0.4, spread=0.1),
            **hands(
                lambda side, s: ('from', f'upperarm_{side}', v(0.02 * s, -0.05, -0.56)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.03 * s, 0.30, -0.30)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.2 * s, 0.3, -0.3)),
                lambda side, s: ('from', f'upperarm_{side}', v(0.15 * s, 0.45, 0.25)),
            ),
        },
        'grip': True,
        'contacts': ['foot_l', 'foot_r'],
    },
    'sliding-leg-curl': {
        'start': {'root': (v(0, 0, 0.60), (-110, 0, 0))},
        'end': {'root': (v(0, 0, 0.66), (-112, 0, 0))},
        'ik': {
            f'calf_{side}': {
                'target': (('at', v(0.12 * s, 0.12, 0.09)), ('at', v(0.12 * s, 0.52, 0.09))),
                'pole': (('at', v(0.12 * s, 0.6, 1.2)),) * 2,
                'foot': (-60, -20),
            }
            for side, s in SIDES
        },
        'arms_down': True,
    },
    'band-lateral-raise': {
        'start': {},
        'end': {},
        'ik': hands(
            lambda side, s: ('at', v(0.24 * s, -0.02, 0.92)),
            lambda side, s: ('at', v(0.70 * s, -0.06, 1.40)),
            lambda side, s: ('at', v(0.45 * s, 0.45, 1.0)),
        ),
        'grip': True,
    },
    'banded-glute-bridge': {
        'start': {'root': (v(0, 0, 0.11), SUPINE)},
        'end': {'root': (v(0, 0, 0.88), (-122, 0, 0))},
        'ik': {
            f'calf_{side}': {
                'target': (('at', v(0.12 * s, 0.45, 0.10)),) * 2,
                'pole': (('at', v(0.12 * s, 0.5, 1.0)),) * 2,
                'foot': (0, 0),
            }
            for side, s in SIDES
        },
        'arms_down': True,
        'grip': True,
        'contacts': ['foot_l', 'foot_r'],
    },
    'band-overhead-triceps-extension': {
        'start': {},
        'end': {},
        'ik': hands(
            lambda side, s: ('at', v(0.08 * s, 0.12, 1.56)),
            lambda side, s: ('at', v(0.10 * s, 0.0, 1.98)),
            lambda side, s: ('at', v(0.18 * s, -0.05, 2.2)),
        ),
        'grip': True,
    },
    'dead-bug': {
        'start': {
            'root': (v(0, 0, 0.11), SUPINE),
            'fk': {
                'thigh_l': ('X', -90), 'thigh_r': ('X', -90), 'calf_l': ('X', 90), 'calf_r': ('X', 90),
                'upperarm_l': ('Z', -90), 'upperarm_r': ('Z', 90),
            },
        },
        'end': {
            'root': (v(0, 0, 0.11), SUPINE),
            'fk': {
                'thigh_l': ('X', -90), 'thigh_r': ('X', -25), 'calf_l': ('X', 90), 'calf_r': ('X', 0),
                'upperarm_l': ('Y', -80), 'upperarm_r': ('Z', 90),
            },
        },
    },
}
