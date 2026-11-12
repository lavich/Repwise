import { EXERCISES } from './exercises'
import {
  EXERCISE_IDS,
  PROGRAM_WEEKS,
  type ExerciseId,
  type ExerciseProgression,
  type Level,
  type Prescription,
  type ProgressionState,
  type Workout,
  type WorkoutExercise,
  type WorkoutId,
  type WorkoutSession,
} from './types'

const rx = (sets: number, reps: number): Prescription => ({ sets, reps })

// Standing exercises come first so the user gets down to the floor only once:
// fewer transitions between lying and standing reduce the risk of dizziness.
export const WORKOUTS: Record<WorkoutId, Workout> = {
  A: {
    id: 'A',
    title: 'Тренировка A',
    subtitle: 'Ноги и кор',
    exercises: [
      { exerciseId: 'banded-squat', weeks: [rx(2, 12), rx(3, 12), rx(3, 15), rx(3, 15)] },
      { exerciseId: 'lateral-band-walk', weeks: [rx(2, 10), rx(2, 12), rx(3, 12), rx(3, 15)] },
      { exerciseId: 'standing-calf-raise', weeks: [rx(2, 12), rx(3, 12), rx(3, 15), rx(3, 18)] },
      { exerciseId: 'glute-bridge', weeks: [rx(2, 12), rx(3, 12), rx(3, 15), rx(3, 15)] },
      { exerciseId: 'dead-bug', weeks: [rx(2, 8), rx(2, 10), rx(3, 10), rx(3, 12)] },
    ],
  },
  B: {
    id: 'B',
    title: 'Тренировка B',
    subtitle: 'Ноги, ягодицы и стабильность',
    exercises: [
      { exerciseId: 'supported-reverse-lunge', weeks: [rx(2, 8), rx(2, 10), rx(3, 10), rx(3, 12)] },
      { exerciseId: 'standing-hip-abduction', weeks: [rx(2, 10), rx(2, 12), rx(3, 12), rx(3, 15)] },
      { exerciseId: 'sit-to-stand', weeks: [rx(2, 10), rx(3, 10), rx(3, 12), rx(3, 15)] },
      { exerciseId: 'banded-clamshell', weeks: [rx(2, 12), rx(3, 12), rx(3, 15), rx(3, 18)] },
      { exerciseId: 'heel-slides', weeks: [rx(2, 8), rx(2, 10), rx(3, 10), rx(3, 12)] },
    ],
  },
}

export const WORKOUTS_PER_WEEK = 2
export const PROGRAM_TOTAL_WORKOUTS = PROGRAM_WEEKS * WORKOUTS_PER_WEEK

export function findWorkoutExercise(exerciseId: ExerciseId): WorkoutExercise {
  for (const workout of Object.values(WORKOUTS)) {
    const found = workout.exercises.find((e) => e.exerciseId === exerciseId)
    if (found) return found
  }
  throw new Error(`Exercise ${exerciseId} is not part of the program`)
}

export function prescriptionFor(exerciseId: ExerciseId, level: Level): Prescription {
  const prescription = findWorkoutExercise(exerciseId).weeks[level - 1]
  if (!prescription) throw new Error(`No prescription for level ${level}`)
  return prescription
}

export function toLevel(value: number): Level {
  const clamped = Math.min(PROGRAM_WEEKS, Math.max(1, Math.round(value)))
  return clamped as Level
}

export function completedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.status === 'completed')
}

export function programWeekAfter(completedCount: number): Level {
  return toLevel(Math.floor(completedCount / WORKOUTS_PER_WEEK) + 1)
}

export function isProgramFinished(completedCount: number): boolean {
  return completedCount >= PROGRAM_TOTAL_WORKOUTS
}

export function nextWorkoutId(sessions: readonly WorkoutSession[]): WorkoutId {
  return completedSessions(sessions).at(-1)?.workoutId === 'A' ? 'B' : 'A'
}

export function initialExerciseProgression(exerciseId: ExerciseId, now: string): ExerciseProgression {
  const equipment = EXERCISES[exerciseId].equipment
  return {
    level: 1,
    band: equipment.kind === 'band' ? equipment.band : null,
    useAlternative: false,
    updatedAt: now,
  }
}

export function initialProgressionState(now: string): ProgressionState {
  return Object.fromEntries(
    EXERCISE_IDS.map((id) => [id, initialExerciseProgression(id, now)]),
  ) as ProgressionState
}
