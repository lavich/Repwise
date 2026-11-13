import type { ExerciseId, ExerciseMuscles } from '@/domain/types'
import { MUSCLE_IDS } from '@/domain/types'

export interface ModelCamera {
  azimuth: number
  elevation: number
}

export type BandSegment = readonly [from: string, to: string]

export interface Model3d {
  clip: string
  // Seconds from the start position to the end position inside the clip;
  // the cycle with holds and the return is built by cycleAt.
  duration: number
  camera: ModelCamera
  bands?: BandSegment[]
  props?: string[]
}

const FEET_TO_HANDS: BandSegment[] = [
  ['foot_l', 'hand_l'],
  ['foot_r', 'hand_r'],
]
const STANDING: ModelCamera = { azimuth: 30, elevation: 8 }
const LYING: ModelCamera = { azimuth: 70, elevation: 28 }

export const PHASE_LABELS: Partial<Record<ExerciseId, { start?: string; end?: string }>> = {
  'seated-band-row': { end: 'Кисти к животу' },
  'band-romanian-deadlift': { end: 'Наклон с ровной спиной' },
  'calf-raise': { start: 'Пятка ниже опоры' },
  'reverse-crunch': { end: 'Таз от пола' },
  'bent-over-band-row': { end: 'Кисти к поясу' },
  'sliding-leg-curl': { start: 'Ноги выпрямлены', end: 'Пятки к себе' },
  'band-overhead-triceps-extension': { start: 'Кисти за головой', end: 'Руки прямые' },
  'dead-bug': { end: 'Рука и нога вниз' },
}

export const MODELS: Record<ExerciseId, Model3d> = {
  'band-squat': { clip: 'band-squat', duration: 1, camera: STANDING, bands: FEET_TO_HANDS },
  'push-up': { clip: 'pushup', duration: 23 / 30, camera: { azimuth: 40, elevation: 4 } },
  'seated-band-row': { clip: 'seated-band-row', duration: 1, camera: { azimuth: 50, elevation: 15 }, bands: FEET_TO_HANDS },
  'band-romanian-deadlift': { clip: 'band-romanian-deadlift', duration: 1, camera: { azimuth: 60, elevation: 8 }, bands: FEET_TO_HANDS },
  'band-overhead-press': { clip: 'band-overhead-press', duration: 1, camera: STANDING, bands: FEET_TO_HANDS },
  'band-biceps-curl': { clip: 'band-biceps-curl', duration: 1, camera: STANDING, bands: FEET_TO_HANDS },
  'calf-raise': { clip: 'calf-raise', duration: 1, camera: { azimuth: 60, elevation: 8 }, props: ['prop_step'] },
  'reverse-crunch': { clip: 'reverse-crunch', duration: 1, camera: LYING },
  'bulgarian-split-squat': { clip: 'bulgarian-split-squat', duration: 1, camera: { azimuth: 65, elevation: 8 }, props: ['prop_bench'] },
  'bent-over-band-row': { clip: 'bent-over-band-row', duration: 1, camera: { azimuth: 55, elevation: 10 }, bands: FEET_TO_HANDS },
  'sliding-leg-curl': { clip: 'sliding-leg-curl', duration: 1, camera: LYING },
  'band-lateral-raise': { clip: 'band-lateral-raise', duration: 1, camera: { azimuth: 15, elevation: 8 }, bands: FEET_TO_HANDS },
  'banded-glute-bridge': {
    clip: 'banded-glute-bridge',
    duration: 1,
    camera: LYING,
    bands: [
      ['hand_l', 'pelvis'],
      ['pelvis', 'hand_r'],
    ],
  },
  'band-overhead-triceps-extension': {
    clip: 'band-overhead-triceps-extension',
    duration: 1,
    camera: STANDING,
    bands: [
      ['foot_r', 'hand_r'],
      ['foot_r', 'hand_l'],
    ],
  },
  'dead-bug': { clip: 'dead-bug', duration: 1, camera: LYING },
}

export const PROP_NAMES = ['prop_bench', 'prop_step'] as const

// Level per muscle group with index 0 for unmarked vertices: 0 is the body
// colour, 1–3 are the steps of the muscle palette.
export type MuscleLevel = 0 | 1 | 2 | 3

export function muscleLevels(muscles: ExerciseMuscles): MuscleLevel[] {
  return [0, ...MUSCLE_IDS.map((id): MuscleLevel => (muscles.primary.includes(id) ? 3 : muscles.secondary.includes(id) ? 1 : 0))]
}

export function clipTime(model: Model3d, t: number): number {
  return Math.min(1, Math.max(0, t)) * model.duration
}
