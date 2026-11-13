import type { MuscleId } from '@/domain/types'

export type BodySide = 'front' | 'back'

export interface MuscleRegion {
  muscle: MuscleId
  side: BodySide
  path: string
}

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`

// Only for paths built from absolute M/L/Q points; ellipses are mirrored by centre.
const mirrorX = (path: string) => path.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${100 - Number(x)} ${y}`)

function pair(muscle: MuscleId, side: BodySide, path: string): MuscleRegion[] {
  return [
    { muscle, side, path },
    { muscle, side, path: mirrorX(path) },
  ]
}

function pairEllipse(muscle: MuscleId, side: BodySide, cx: number, cy: number, rx: number, ry: number): MuscleRegion[] {
  return [
    { muscle, side, path: ellipse(cx, cy, rx, ry) },
    { muscle, side, path: ellipse(100 - cx, cy, rx, ry) },
  ]
}

export const SILHOUETTE: string[] = [
  ellipse(50, 16, 11, 12),
  'M 45 26 L 55 26 L 56 36 L 44 36 Z',
  'M 30 38 Q 50 32 70 38 L 72 62 Q 67 88 65 104 L 35 104 Q 33 88 28 62 Z',
  'M 34 100 L 66 100 L 68 120 L 32 120 Z',
  'M 22 44 Q 30 40 32 48 L 30 84 L 20 84 Z',
  'M 78 44 Q 70 40 68 48 L 70 84 L 80 84 Z',
  'M 19 82 L 30 82 L 27 108 L 18 108 Z',
  'M 81 82 L 70 82 L 73 108 L 82 108 Z',
  ellipse(22, 112, 4.5, 5),
  ellipse(78, 112, 4.5, 5),
  'M 32 114 L 49 114 L 47 162 L 34 162 Z',
  'M 68 114 L 51 114 L 53 162 L 66 162 Z',
  'M 34 160 L 47 160 L 45 200 L 36 200 Z',
  'M 66 160 L 53 160 L 55 200 L 64 200 Z',
  ellipse(40, 205, 7, 4),
  ellipse(60, 205, 7, 4),
]

export const MUSCLE_REGIONS: MuscleRegion[] = [
  ...pairEllipse('front-delts', 'front', 31, 46, 6.5, 7.5),
  ...pairEllipse('side-delts', 'front', 24.5, 52, 3.5, 7),
  ...pair('chest', 'front', 'M 36 42 Q 46 39 49 42 L 49 59 Q 42 63 35 57 Z'),
  ...pairEllipse('biceps', 'front', 25, 67, 4.5, 11),
  { muscle: 'abs', side: 'front', path: 'M 43 64 L 57 64 L 57 98 Q 50 102 43 98 Z' },
  ...pair('obliques', 'front', 'M 35 64 L 41 66 L 41 96 L 37 94 Q 35 80 34 70 Z'),
  ...pairEllipse('quads', 'front', 40, 136, 7, 21),
  ...pair('adductors', 'front', 'M 47 120 L 49 120 L 48 146 Q 45 136 45 124 Z'),
  ...pairEllipse('calves', 'front', 37.5, 176, 2.5, 11),
  { muscle: 'upper-back', side: 'back', path: 'M 50 30 L 64 41 L 57 64 L 50 66 L 43 64 L 36 41 Z' },
  ...pairEllipse('upper-back', 'back', 31, 46, 6.5, 7.5),
  ...pairEllipse('side-delts', 'back', 24.5, 52, 3.5, 7),
  ...pair('lats', 'back', 'M 35 50 L 42 62 L 48 68 L 48 84 L 41 88 Q 33 72 32 56 Z'),
  ...pairEllipse('triceps', 'back', 25, 67, 4.5, 11),
  { muscle: 'lower-back', side: 'back', path: 'M 43 86 L 57 86 L 58 100 L 42 100 Z' },
  ...pairEllipse('glutes', 'back', 42, 111, 8.5, 9.5),
  ...pairEllipse('hamstrings', 'back', 40.5, 141, 6.5, 18),
  ...pairEllipse('calves', 'back', 40.5, 178, 5.5, 13),
]
