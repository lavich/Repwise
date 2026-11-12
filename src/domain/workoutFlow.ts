import { EXERCISES } from './exercises'
import { nextWorkoutId } from './program'
import { blocksIncrease, isActionable, suggestProgression } from './progression'
import {
  completeSession,
  createSession,
  firstUnfinishedIndex,
  recordSet,
  setTechnique,
  skipExercise,
  stopSession,
} from './session'
import type {
  ActiveWorkout,
  AppData,
  ExerciseSkip,
  ProgressionSuggestion,
  SessionFeedback,
  WorkoutId,
} from './types'

function advance(active: ActiveWorkout): ActiveWorkout {
  const next = firstUnfinishedIndex(active.session)
  if (next === -1) return { ...active, phase: 'feedback', restEndsAt: null }
  return { ...active, exerciseIndex: next, phase: 'intro', restEndsAt: null }
}

export function beginExercise(active: ActiveWorkout): ActiveWorkout {
  return { ...active, phase: 'set' }
}

export function completeSet(
  active: ActiveWorkout,
  completedReps: number,
  restSeconds: number,
  now: Date,
): ActiveWorkout {
  const session = recordSet(active.session, active.exerciseIndex, completedReps, now.toISOString())
  const exercise = session.exercises[active.exerciseIndex]
  if (exercise && exercise.sets.length < exercise.targetSets) {
    const rest = EXERCISES[exercise.exerciseId].restSeconds ?? restSeconds
    return { ...active, session, phase: 'rest', restEndsAt: new Date(now.getTime() + rest * 1000).toISOString() }
  }
  return { ...active, session, phase: 'technique', restEndsAt: null }
}

export function finishRest(active: ActiveWorkout): ActiveWorkout {
  return { ...active, phase: 'set', restEndsAt: null }
}

export function extendRest(active: ActiveWorkout, seconds: number, now: Date): ActiveWorkout {
  const base = Math.max(now.getTime(), active.restEndsAt ? Date.parse(active.restEndsAt) : now.getTime())
  return { ...active, restEndsAt: new Date(base + seconds * 1000).toISOString() }
}

export function answerTechnique(active: ActiveWorkout, goodTechnique: boolean): ActiveWorkout {
  return advance({ ...active, session: setTechnique(active.session, active.exerciseIndex, goodTechnique) })
}

export function skipCurrentExercise(active: ActiveWorkout, skip: ExerciseSkip): ActiveWorkout {
  return advance({ ...active, session: skipExercise(active.session, active.exerciseIndex, skip) })
}

export function requestStop(active: ActiveWorkout): ActiveWorkout {
  return { ...active, phase: 'feedback', restEndsAt: null, stopping: true }
}

export function startWorkout(data: AppData, sessionId: string, now: string, workoutId?: WorkoutId): AppData {
  if (data.activeWorkout) return data
  const session = createSession({
    id: sessionId,
    workoutId: workoutId ?? nextWorkoutId(data.sessions),
    progression: data.progression,
    now,
  })
  return {
    ...data,
    activeWorkout: { session, exerciseIndex: 0, phase: 'intro', restEndsAt: null, stopping: false },
  }
}

export function finishWorkout(data: AppData, feedback: SessionFeedback, now: string): AppData {
  const active = data.activeWorkout
  if (!active) return data
  const anySetRecorded = active.session.exercises.some((e) => e.sets.length > 0)
  const completed = !active.stopping && active.phase === 'feedback' && anySetRecorded
  const session = completed
    ? completeSession(active.session, feedback, now)
    : stopSession(active.session, feedback, now)
  const suggestions = suggestProgression(session)
  const performed = new Set(session.exercises.filter((e) => e.sets.length > 0).map((e) => e.exerciseId))
  const blocked = blocksIncrease(session)
  const kept = data.pendingSuggestions.filter(
    (s) => !performed.has(s.exerciseId) && !(blocked && s.kind === 'step-up'),
  )
  const waiting = new Set(kept.map((s) => s.exerciseId))
  const added = suggestions.filter((s) => performed.has(s.exerciseId) || !waiting.has(s.exerciseId))
  return {
    ...data,
    sessions: [...data.sessions, session],
    activeWorkout: null,
    pendingSuggestions: [...kept, ...added],
  }
}

export function pendingActionableSuggestions(data: AppData): ProgressionSuggestion[] {
  return data.pendingSuggestions.filter(
    (s) => isActionable(s) && data.progression[s.exerciseId].stepId === s.currentStepId,
  )
}
