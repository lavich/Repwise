import { EXERCISES } from './exercises'
import { WORKOUTS } from './program'
import type {
  ExerciseId,
  ExerciseSkip,
  ProgressionState,
  SessionExercise,
  SessionFeedback,
  WorkoutId,
  WorkoutSession,
} from './types'

interface CreateSessionInput {
  id: string
  workoutId: WorkoutId
  progression: ProgressionState
  now: string
}

export function createSession({ id, workoutId, progression, now }: CreateSessionInput): WorkoutSession {
  const exercises = WORKOUTS[workoutId].exerciseIds.map<SessionExercise>((exerciseId) => {
    const exercise = EXERCISES[exerciseId]
    return {
      exerciseId,
      stepId: progression[exerciseId].stepId,
      repMin: exercise.repRange.min,
      repMax: exercise.repRange.max,
      perSide: exercise.perSide,
      targetSets: exercise.sets,
      sets: [],
      goodTechnique: null,
    }
  })
  return { id, workoutId, startedAt: now, status: 'in-progress', exercises }
}

function updateExercise(
  session: WorkoutSession,
  index: number,
  update: (exercise: SessionExercise) => SessionExercise,
): WorkoutSession {
  if (session.status !== 'in-progress') throw new Error('Session is already finished')
  const current = session.exercises[index]
  if (!current) throw new Error(`No exercise at index ${index}`)
  const exercises = session.exercises.slice()
  exercises[index] = update(current)
  return { ...session, exercises }
}

export function isExerciseDone(exercise: SessionExercise): boolean {
  return exercise.skipped !== undefined || exercise.sets.length >= exercise.targetSets
}

export function recordSet(
  session: WorkoutSession,
  index: number,
  completedReps: number,
  now: string,
): WorkoutSession {
  return updateExercise(session, index, (exercise) => {
    if (isExerciseDone(exercise)) throw new Error('All sets are already recorded')
    return {
      ...exercise,
      sets: [
        ...exercise.sets,
        {
          setNumber: exercise.sets.length + 1,
          repMin: exercise.repMin,
          repMax: exercise.repMax,
          completedReps: Math.max(0, Math.round(completedReps)),
          completedAt: now,
        },
      ],
    }
  })
}

export function setTechnique(session: WorkoutSession, index: number, goodTechnique: boolean): WorkoutSession {
  return updateExercise(session, index, (exercise) => ({ ...exercise, goodTechnique }))
}

export function skipExercise(session: WorkoutSession, index: number, skip: ExerciseSkip): WorkoutSession {
  const note = skip.note?.trim()
  return updateExercise(session, index, (exercise) => ({
    ...exercise,
    skipped: note ? { reason: skip.reason, note } : { reason: skip.reason },
  }))
}

export function firstUnfinishedIndex(session: WorkoutSession): number {
  return session.exercises.findIndex((e) => !isExerciseDone(e))
}

function normalizeFeedback(feedback: SessionFeedback): SessionFeedback {
  return {
    rpe: Math.min(10, Math.max(1, Math.round(feedback.rpe))),
    pain: feedback.pain,
    notes: feedback.notes.trim(),
  }
}

export function completeSession(session: WorkoutSession, feedback: SessionFeedback, now: string): WorkoutSession {
  if (session.status !== 'in-progress') throw new Error('Session is already finished')
  return { ...session, status: 'completed', finishedAt: now, feedback: normalizeFeedback(feedback) }
}

export function stopSession(session: WorkoutSession, feedback: SessionFeedback, now: string): WorkoutSession {
  if (session.status !== 'in-progress') throw new Error('Session is already finished')
  return { ...session, status: 'stopped', finishedAt: now, feedback: normalizeFeedback(feedback) }
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + set.completedReps, 0),
    0,
  )
}

export function lastPerformance(
  sessions: readonly WorkoutSession[],
  exerciseId: ExerciseId,
  stepId: string,
): number[] | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i]
    if (!session || session.status === 'in-progress') continue
    const match = session.exercises.find(
      (e) => e.exerciseId === exerciseId && e.stepId === stepId && e.sets.length > 0,
    )
    if (match) return match.sets.map((set) => set.completedReps)
  }
  return null
}

export function defaultReps(previous: number[] | null, setNumber: number, repMin: number): number {
  return previous?.[setNumber - 1] ?? repMin
}
