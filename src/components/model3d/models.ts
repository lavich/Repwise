import type { ExerciseId, ExerciseMuscles } from '@/domain/types'
import { MUSCLE_IDS } from '@/domain/types'

export interface ModelCamera {
  azimuth: number
  elevation: number
}

export interface Model3d {
  clip: string
  // Seconds from the start position to the end position inside the clip;
  // the cycle with holds and the return is built by cycleAt, as for 2D.
  duration: number
  camera: ModelCamera
  band?: boolean
}

export const MODELS: Partial<Record<ExerciseId, Model3d>> = {
  'push-up': { clip: 'pushup', duration: 18 / 30, camera: { azimuth: 40, elevation: 4 } },
  'band-squat': { clip: 'band-squat', duration: 1, camera: { azimuth: 30, elevation: 10 }, band: true },
}

export type MuscleLevel = 0 | 1 | 2

export function muscleLevels(muscles: ExerciseMuscles): MuscleLevel[] {
  return [0, ...MUSCLE_IDS.map((id): MuscleLevel => (muscles.primary.includes(id) ? 2 : muscles.secondary.includes(id) ? 1 : 0))]
}

export function clipTime(model: Model3d, t: number): number {
  return Math.min(1, Math.max(0, t)) * model.duration
}
