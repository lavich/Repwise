import { EXERCISES } from './exercises'
import {
  EXERCISE_IDS,
  type ExerciseId,
  type ExerciseProgression,
  type ProgressionState,
  type Workout,
  type WorkoutId,
  type WorkoutSession,
} from './types'

export const WORKOUTS: Record<WorkoutId, Workout> = {
  A: {
    id: 'A',
    title: 'Тренировка A',
    subtitle: 'Всё тело: присед, жимы, тяги',
    exerciseIds: [
      'band-squat',
      'push-up',
      'seated-band-row',
      'band-romanian-deadlift',
      'band-overhead-press',
      'band-biceps-curl',
      'calf-raise',
      'reverse-crunch',
    ],
  },
  B: {
    id: 'B',
    title: 'Тренировка B',
    subtitle: 'Всё тело: выпады, тяги, ягодицы',
    exerciseIds: [
      'bulgarian-split-squat',
      'bent-over-band-row',
      'push-up',
      'sliding-leg-curl',
      'band-lateral-raise',
      'banded-glute-bridge',
      'band-overhead-triceps-extension',
      'dead-bug',
    ],
  },
}

export const WEEKLY_GOAL = 3

export function completedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.status === 'completed')
}

export function nextWorkoutId(sessions: readonly WorkoutSession[]): WorkoutId {
  return completedSessions(sessions).at(-1)?.workoutId === 'A' ? 'B' : 'A'
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export function completedThisWeek(sessions: readonly WorkoutSession[], now: Date): number {
  const from = startOfWeek(now).getTime()
  const to = new Date(from).setDate(new Date(from).getDate() + 7)
  return completedSessions(sessions).filter((s) => {
    const started = Date.parse(s.startedAt)
    return started >= from && started < to
  }).length
}

export function initialExerciseProgression(exerciseId: ExerciseId, now: string): ExerciseProgression {
  return { stepId: EXERCISES[exerciseId].defaultStepId, updatedAt: now }
}

export function initialProgressionState(now: string): ProgressionState {
  return Object.fromEntries(
    EXERCISE_IDS.map((id) => [id, initialExerciseProgression(id, now)]),
  ) as ProgressionState
}
