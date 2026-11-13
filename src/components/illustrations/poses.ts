import type { ExerciseId } from '@/domain/types'

export type Point = readonly [number, number]

export type LimbKind = 'torso' | 'girdle' | 'arm' | 'leg'

export interface Limb {
  kind: LimbKind
  points: Point[]
  far?: boolean
}

export type Prop = 'chair-left' | 'step' | 'mat'

export interface Pose {
  head: Point
  limbs: Limb[]
  bands?: Point[][]
  props?: Prop[]
  towel?: Point
}

export interface Tempo {
  toEnd: number
  holdEnd: number
  toStart: number
  holdStart: number
}

export interface ExerciseFrames {
  start: Pose
  end: Pose
  startLabel?: string
  endLabel?: string
  tempo?: Tempo
}

const limbOf =
  (kind: LimbKind) =>
  (...points: Point[]): Limb => ({ kind, points })
const torso = limbOf('torso')
const girdle = limbOf('girdle')
const arm = limbOf('arm')
const leg = limbOf('leg')
const far = (limb: Limb): Limb => ({ ...limb, far: true })

function frontStanding(arms: [Limb, Limb], bands: Point[][]): Pose {
  return {
    head: [80, 24],
    limbs: [
      torso([80, 36], [80, 72]),
      girdle([70, 39], [90, 39]),
      girdle([75, 72], [85, 72]),
      leg([75, 72], [75, 98], [75, 126]),
      leg([85, 72], [85, 98], [85, 126]),
      ...arms,
    ],
    bands,
  }
}

export const FRAMES: Record<ExerciseId, ExerciseFrames> = {
  'band-squat': {
    start: {
      head: [80, 22],
      limbs: [
        torso([80, 34], [80, 70]),
        leg([80, 70], [82, 98], [80, 126], [92, 126]),
        arm([80, 36], [92, 48], [86, 36]),
      ],
      bands: [[[82, 126], [78, 38]]],
    },
    end: {
      head: [92, 54],
      limbs: [
        torso([86, 66], [66, 96]),
        leg([66, 96], [98, 104], [80, 126], [92, 126]),
        arm([86, 68], [98, 78], [92, 66]),
      ],
      bands: [[[82, 126], [84, 66]]],
    },
  },
  'push-up': {
    start: {
      head: [122, 90],
      limbs: [
        torso([110, 98], [70, 112]),
        leg([70, 112], [49, 119], [28, 126]),
        arm([110, 98], [110, 112], [112, 126]),
      ],
    },
    end: {
      head: [122, 113],
      limbs: [
        torso([110, 118], [70, 121]),
        leg([70, 121], [49, 123], [28, 126]),
        arm([110, 118], [96, 112], [112, 126]),
      ],
    },
  },
  'seated-band-row': {
    start: {
      head: [54, 76],
      limbs: [
        torso([52, 88], [50, 124]),
        leg([50, 124], [86, 116], [118, 124], [122, 116]),
        arm([52, 90], [84, 100], [112, 110]),
      ],
      bands: [[[112, 110], [122, 120]]],
      props: ['mat'],
    },
    end: {
      head: [52, 76],
      limbs: [
        torso([50, 88], [50, 124]),
        leg([50, 124], [86, 116], [118, 124], [122, 116]),
        arm([50, 90], [36, 102], [60, 108]),
      ],
      bands: [[[60, 108], [122, 120]]],
      props: ['mat'],
    },
    endLabel: 'Кисти к животу',
  },
  'band-romanian-deadlift': {
    start: {
      head: [80, 22],
      limbs: [
        torso([80, 34], [80, 72]),
        leg([80, 72], [82, 98], [80, 126], [92, 126]),
        arm([80, 36], [82, 56], [82, 76]),
      ],
      bands: [[[82, 76], [84, 126]]],
    },
    end: {
      head: [112, 56],
      limbs: [
        torso([100, 62], [62, 74]),
        leg([62, 74], [74, 98], [80, 126], [92, 126]),
        arm([100, 62], [98, 84], [96, 104]),
      ],
      bands: [[[96, 104], [80, 126]]],
    },
    endLabel: 'Наклон с ровной спиной',
  },
  'band-overhead-press': {
    start: frontStanding(
      [arm([70, 39], [60, 52], [64, 36]), arm([90, 39], [100, 52], [96, 36])],
      [[[75, 126], [64, 36]], [[85, 126], [96, 36]]],
    ),
    end: frontStanding(
      [arm([70, 39], [66, 22], [68, 6]), arm([90, 39], [94, 22], [92, 6])],
      [[[75, 126], [68, 6]], [[85, 126], [92, 6]]],
    ),
  },
  'band-biceps-curl': {
    start: {
      head: [80, 22],
      limbs: [
        torso([80, 34], [80, 72]),
        leg([80, 72], [82, 98], [80, 126], [92, 126]),
        arm([80, 36], [82, 56], [84, 76]),
      ],
      bands: [[[84, 76], [84, 126]]],
    },
    end: {
      head: [80, 22],
      limbs: [
        torso([80, 34], [80, 72]),
        leg([80, 72], [82, 98], [80, 126], [92, 126]),
        arm([80, 36], [82, 56], [96, 42]),
      ],
      bands: [[[96, 42], [84, 126]]],
    },
  },
  'calf-raise': {
    start: {
      head: [76, 18],
      limbs: [
        torso([76, 30], [76, 64]),
        leg([76, 64], [78, 90], [74, 116], [88, 114]),
        arm([76, 32], [80, 48], [80, 64]),
      ],
      props: ['step'],
    },
    end: {
      head: [80, 12],
      limbs: [
        torso([80, 24], [80, 56]),
        leg([80, 56], [82, 80], [84, 106], [90, 114]),
        arm([80, 26], [84, 42], [84, 56]),
      ],
      props: ['step'],
    },
    startLabel: 'Пятка ниже опоры',
  },
  'reverse-crunch': {
    start: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [86, 122]),
        leg([86, 122], [90, 96], [114, 98]),
        arm([42, 121], [62, 124], [82, 125]),
      ],
      props: ['mat'],
    },
    end: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [82, 114]),
        leg([82, 114], [68, 90], [92, 82]),
        arm([42, 121], [62, 124], [82, 125]),
      ],
      props: ['mat'],
    },
    endLabel: 'Таз от пола',
  },
  'bulgarian-split-squat': {
    start: {
      head: [80, 22],
      limbs: [
        torso([80, 34], [80, 72]),
        leg([80, 72], [88, 98], [90, 126], [102, 126]),
        arm([80, 36], [82, 56], [82, 72]),
        far(leg([80, 72], [64, 96], [48, 96], [42, 90])),
      ],
      props: ['chair-left'],
    },
    end: {
      head: [80, 48],
      limbs: [
        torso([78, 60], [74, 96]),
        leg([74, 96], [100, 98], [90, 126], [102, 126]),
        arm([78, 62], [80, 80], [80, 96]),
        far(leg([74, 96], [60, 118], [46, 94], [42, 90])),
      ],
      props: ['chair-left'],
    },
  },
  'bent-over-band-row': {
    start: {
      head: [110, 46],
      limbs: [
        torso([98, 52], [64, 72]),
        leg([64, 72], [74, 98], [76, 126], [88, 126]),
        arm([98, 52], [96, 74], [94, 94]),
      ],
      bands: [[[94, 94], [80, 126]]],
    },
    end: {
      head: [110, 46],
      limbs: [
        torso([98, 52], [64, 72]),
        leg([64, 72], [74, 98], [76, 126], [88, 126]),
        arm([98, 52], [80, 46], [86, 66]),
      ],
      bands: [[[86, 66], [80, 126]]],
    },
    endLabel: 'Кисти к поясу',
  },
  'sliding-leg-curl': {
    start: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [84, 108]),
        leg([84, 108], [112, 114], [140, 122]),
        arm([42, 121], [62, 124], [82, 125]),
      ],
      props: ['mat'],
      towel: [140, 122],
    },
    end: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [84, 98]),
        leg([84, 98], [110, 90], [118, 122]),
        arm([42, 121], [62, 124], [82, 125]),
      ],
      props: ['mat'],
      towel: [118, 122],
    },
    startLabel: 'Ноги выпрямлены',
    endLabel: 'Пятки к себе',
  },
  'band-lateral-raise': {
    start: frontStanding(
      [arm([70, 39], [67, 56], [67, 72]), arm([90, 39], [93, 56], [93, 72])],
      [[[75, 126], [67, 72]], [[85, 126], [93, 72]]],
    ),
    end: frontStanding(
      [arm([70, 39], [54, 40], [38, 42]), arm([90, 39], [106, 40], [122, 42])],
      [[[75, 126], [38, 42]], [[85, 126], [122, 42]]],
    ),
  },
  'banded-glute-bridge': {
    start: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [86, 122]),
        leg([86, 122], [110, 98], [124, 126], [134, 126]),
        arm([42, 121], [62, 124], [82, 125]),
      ],
      bands: [[[74, 126], [86, 117], [98, 126]]],
      props: ['mat'],
    },
    end: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [84, 98]),
        leg([84, 98], [112, 94], [124, 126], [134, 126]),
        arm([42, 121], [62, 124], [82, 125]),
      ],
      bands: [[[72, 126], [84, 93], [96, 126]]],
      props: ['mat'],
    },
  },
  'band-overhead-triceps-extension': {
    start: frontStanding(
      [arm([70, 39], [66, 12], [78, 6]), arm([90, 39], [94, 12], [82, 6])],
      [[[75, 126], [80, 6]]],
    ),
    end: frontStanding(
      [arm([70, 39], [68, 18], [74, 2]), arm([90, 39], [92, 18], [86, 2])],
      [[[75, 126], [80, 2]]],
    ),
    startLabel: 'Кисти за головой',
    endLabel: 'Руки прямые',
  },
  'dead-bug': {
    start: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [84, 122]),
        leg([84, 122], [86, 94], [112, 94]),
        arm([44, 119], [46, 98], [48, 78]),
        far(leg([84, 122], [84, 94], [110, 94])),
        far(arm([44, 119], [44, 98], [46, 78])),
      ],
      props: ['mat'],
    },
    end: {
      head: [30, 115],
      limbs: [
        torso([42, 120], [84, 122]),
        leg([84, 122], [110, 112], [136, 118]),
        arm([44, 119], [28, 108], [12, 112]),
        far(leg([84, 122], [84, 94], [110, 94])),
        far(arm([44, 119], [44, 98], [46, 78])),
      ],
      props: ['mat'],
    },
    endLabel: 'Рука и нога вниз',
  },
}
