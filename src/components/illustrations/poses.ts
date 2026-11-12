import type { ExerciseId } from '@/domain/types'

export type Point = readonly [number, number]

export type Prop = 'chair' | 'chair-back-right' | 'post-left' | 'mat' | 'pillow'

export interface Pose {
  head: Point
  near: Point[][]
  far?: Point[][]
  band?: readonly [Point, Point]
  props?: Prop[]
}

export interface ExerciseFrames {
  start: Pose
  end: Pose
  startLabel?: string
  endLabel?: string
}

// Short stroke across a thigh segment, close to the knee, to mark the band.
function bandAcross(hip: Point, knee: Point, t = 0.78, half = 6): readonly [Point, Point] {
  const [hx, hy] = hip
  const [kx, ky] = knee
  const cx = hx + (kx - hx) * t
  const cy = hy + (ky - hy) * t
  const length = Math.hypot(kx - hx, ky - hy) || 1
  const nx = -(ky - hy) / length
  const ny = (kx - hx) / length
  return [
    [cx + nx * half, cy + ny * half],
    [cx - nx * half, cy - ny * half],
  ]
}

const LYING_HEAD: Point = [30, 115]
const LYING_NECK: Point = [42, 120]
const LYING_ARM: Point[] = [[42, 121], [62, 124], [82, 125]]

export const FRAMES: Record<ExerciseId, ExerciseFrames> = {
  'banded-squat': {
    start: {
      head: [80, 22],
      near: [
        [[80, 34], [80, 70]],
        [[80, 70], [82, 98], [80, 126], [92, 126]],
        [[80, 36], [82, 54], [84, 70]],
      ],
      band: bandAcross([80, 70], [82, 98]),
    },
    end: {
      head: [92, 54],
      near: [
        [[86, 66], [66, 96]],
        [[66, 96], [98, 104], [80, 126], [92, 126]],
        [[86, 68], [104, 74], [120, 74]],
      ],
      band: bandAcross([66, 96], [98, 104]),
    },
  },
  'glute-bridge': {
    start: {
      head: LYING_HEAD,
      near: [
        [LYING_NECK, [86, 122]],
        [[86, 122], [110, 98], [124, 126], [134, 126]],
        LYING_ARM,
      ],
      band: bandAcross([86, 122], [110, 98]),
      props: ['mat'],
    },
    end: {
      head: LYING_HEAD,
      near: [
        [LYING_NECK, [84, 98]],
        [[84, 98], [112, 94], [124, 126], [134, 126]],
        LYING_ARM,
      ],
      band: bandAcross([84, 98], [112, 94]),
      props: ['mat'],
    },
  },
  'lateral-band-walk': {
    start: {
      head: [80, 24],
      near: [
        [[80, 36], [80, 72]],
        [[70, 39], [90, 39]],
        [[72, 72], [88, 72]],
        [[72, 72], [69, 98], [68, 126]],
        [[88, 72], [91, 98], [92, 126]],
        [[70, 39], [66, 56], [67, 72]],
        [[90, 39], [94, 56], [93, 72]],
      ],
      band: [[69, 92], [91, 92]],
    },
    end: {
      head: [84, 24],
      near: [
        [[84, 36], [84, 72]],
        [[74, 39], [94, 39]],
        [[76, 72], [92, 72]],
        [[76, 72], [72, 98], [70, 126]],
        [[92, 72], [104, 98], [112, 126]],
        [[74, 39], [70, 56], [71, 72]],
        [[94, 39], [98, 56], [97, 72]],
      ],
      band: [[72, 92], [101, 92]],
    },
    endLabel: 'Шаг в сторону',
  },
  'standing-calf-raise': {
    start: {
      head: [76, 24],
      near: [
        [[76, 36], [76, 72]],
        [[76, 72], [78, 98], [76, 126], [88, 126]],
        [[76, 38], [90, 50], [106, 58]],
      ],
      props: ['chair-back-right'],
    },
    end: {
      head: [78, 14],
      near: [
        [[78, 26], [78, 62]],
        [[78, 62], [80, 88], [80, 116], [90, 126]],
        [[78, 28], [92, 46], [106, 56]],
      ],
      props: ['chair-back-right'],
    },
  },
  'dead-bug': {
    start: {
      head: LYING_HEAD,
      near: [
        [LYING_NECK, [84, 122]],
        [[84, 122], [86, 94], [112, 94]],
        LYING_ARM,
      ],
      far: [[[84, 122], [84, 94], [110, 94]]],
      props: ['mat'],
    },
    end: {
      head: LYING_HEAD,
      near: [
        [LYING_NECK, [84, 122]],
        [[84, 122], [110, 112], [136, 124]],
        LYING_ARM,
      ],
      far: [[[84, 122], [84, 94], [110, 94]]],
      props: ['mat'],
    },
    endLabel: 'Пятка к полу',
  },
  'supported-reverse-lunge': {
    start: {
      head: [70, 24],
      near: [
        [[70, 36], [70, 72]],
        [[70, 72], [72, 98], [70, 126], [82, 126]],
        [[70, 38], [86, 50], [104, 58]],
      ],
      props: ['chair-back-right'],
    },
    end: {
      head: [64, 48],
      near: [
        [[64, 60], [64, 96]],
        [[64, 96], [86, 98], [84, 126], [96, 126]],
        [[64, 62], [84, 70], [104, 72]],
      ],
      far: [[[64, 96], [48, 120], [26, 118], [20, 126]]],
      props: ['chair-back-right'],
    },
  },
  'banded-clamshell': {
    start: {
      head: [30, 104],
      near: [
        [[44, 110], [90, 112]],
        [[90, 112], [118, 116], [96, 124]],
        [[44, 112], [62, 118], [76, 124]],
      ],
      far: [[[90, 114], [118, 122], [96, 126]]],
      band: [[112, 115], [112, 121]],
      props: ['pillow', 'mat'],
    },
    end: {
      head: [30, 104],
      near: [
        [[44, 110], [90, 112]],
        [[90, 112], [112, 92], [96, 124]],
        [[44, 112], [62, 118], [76, 124]],
      ],
      far: [[[90, 114], [118, 122], [96, 126]]],
      band: [[108, 96], [112, 121]],
      props: ['pillow', 'mat'],
    },
    endLabel: 'Колено вверх',
  },
  'standing-hip-abduction': {
    start: {
      head: [90, 24],
      near: [
        [[90, 36], [90, 72]],
        [[80, 39], [100, 39]],
        [[82, 72], [98, 72]],
        [[82, 72], [82, 98], [82, 126]],
        [[98, 72], [98, 98], [98, 126]],
        [[80, 39], [66, 52], [54, 60]],
        [[100, 39], [104, 56], [101, 72]],
      ],
      band: [[82, 94], [98, 94]],
      props: ['post-left'],
    },
    end: {
      head: [88, 24],
      near: [
        [[88, 36], [90, 72]],
        [[78, 39], [98, 39]],
        [[82, 72], [98, 72]],
        [[82, 72], [82, 98], [82, 126]],
        [[98, 72], [114, 96], [128, 122]],
        [[78, 39], [66, 52], [54, 60]],
        [[98, 39], [102, 56], [100, 72]],
      ],
      band: [[82, 94], [111, 92]],
      props: ['post-left'],
    },
    endLabel: 'Нога в сторону',
  },
  'sit-to-stand': {
    start: {
      head: [74, 44],
      near: [
        [[70, 56], [64, 90]],
        [[64, 90], [92, 90], [90, 126], [102, 126]],
        [[70, 58], [84, 66], [76, 72]],
      ],
      props: ['chair'],
    },
    end: {
      head: [88, 24],
      near: [
        [[88, 36], [88, 72]],
        [[88, 72], [91, 98], [90, 126], [102, 126]],
        [[88, 40], [100, 48], [92, 56]],
      ],
      props: ['chair'],
    },
  },
  'heel-slides': {
    start: {
      head: LYING_HEAD,
      near: [
        [LYING_NECK, [86, 122]],
        [[86, 122], [110, 98], [124, 126], [134, 126]],
        LYING_ARM,
      ],
      props: ['mat'],
    },
    end: {
      head: LYING_HEAD,
      near: [
        [LYING_NECK, [86, 122]],
        [[86, 122], [116, 123], [144, 124], [148, 117]],
        LYING_ARM,
      ],
      far: [[[86, 122], [110, 98], [124, 126], [134, 126]]],
      props: ['mat'],
    },
    endLabel: 'Нога выпрямлена',
  },
}
