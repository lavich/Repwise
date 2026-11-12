import { EXERCISES } from './exercises'
import { prescriptionFor, WORKOUTS } from './program'
import type {
  ExerciseSkip,
  Level,
  ProgressionState,
  SessionExercise,
  SessionFeedback,
  WorkoutId,
  WorkoutSession,
} from './types'

interface CreateSessionInput {
  id: string
  workoutId: WorkoutId
  programWeek: Level
  progression: ProgressionState
  now: string
}

export function createSession({ id, workoutId, programWeek, progression, now }: CreateSessionInput): WorkoutSession {
  const exercises = WORKOUTS[workoutId].exercises.map<SessionExercise>(({ exerciseId }) => {
    const state = progression[exerciseId]
    const target = prescriptionFor(exerciseId, state.level)
    const alternativeId = EXERCISES[exerciseId].alternativeId
    return {
      plannedExerciseId: exerciseId,
      performedExerciseId: state.useAlternative && alternativeId ? alternativeId : exerciseId,
      level: state.level,
      band: state.band,
      targetSets: target.sets,
      targetReps: target.reps,
      sets: [],
      goodTechnique: null,
    }
  })
  return { id, workoutId, programWeek, startedAt: now, status: 'in-progress', exercises }
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
          targetReps: exercise.targetReps,
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

export function switchToAlternative(session: WorkoutSession, index: number): WorkoutSession {
  return updateExercise(session, index, (exercise) => {
    const alternativeId = EXERCISES[exercise.plannedExerciseId].alternativeId
    if (!alternativeId) throw new Error('Exercise has no alternative')
    if (exercise.sets.length > 0) throw new Error('Cannot switch after sets were recorded')
    return { ...exercise, performedExerciseId: alternativeId }
  })
}

export function firstUnfinishedIndex(session: WorkoutSession): number {
  return session.exercises.findIndex((e) => !isExerciseDone(e))
}

function normalizeFeedback(feedback: SessionFeedback): SessionFeedback {
  return {
    rpe: Math.min(10, Math.max(1, Math.round(feedback.rpe))),
    pain: feedback.pain,
    dizzinessOrNausea: feedback.dizzinessOrNausea,
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
