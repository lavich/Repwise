import { EXERCISES, stepIndex, stepLabel } from './exercises'
import type {
  ExerciseId,
  ProgressionDecisionKind,
  ProgressionState,
  ProgressionSuggestion,
  SessionExercise,
  WorkoutSession,
} from './types'

export interface ProgressionDecision {
  kind: ProgressionDecisionKind
  reason: string
  proposedStepId: string
}

export interface ExerciseEvaluationInput {
  exercise: SessionExercise
  painReported: boolean
  stopped: boolean
}

function neighbourStep(exerciseId: ExerciseId, stepId: string, offset: 1 | -1): string | null {
  const steps = EXERCISES[exerciseId].loadSteps
  return steps[stepIndex(exerciseId, stepId) + offset]?.id ?? null
}

function baseDecision(exercise: SessionExercise): ProgressionDecision {
  const { exerciseId, stepId, sets } = exercise
  const keep = (kind: ProgressionDecisionKind, reason: string) => ({ kind, reason, proposedStepId: stepId })

  if (exercise.skipped) return keep('keep', 'Упражнение пропущено — в следующий раз та же ступень.')
  if (sets.length === 0) return keep('keep', 'Упражнение не выполнялось — ступень не меняется.')

  const first = sets[0]
  if (first && first.completedReps < exercise.repMin) {
    const lighter = neighbourStep(exerciseId, stepId, -1)
    if (lighter) {
      return {
        kind: 'step-down',
        reason: `Первый подход ниже ${exercise.repMin} повторов — попробуйте ступень «${stepLabel(exerciseId, lighter)}».`,
        proposedStepId: lighter,
      }
    }
    return keep('bottom-step', 'Это самая лёгкая ступень — делайте сколько получается с хорошей техникой.')
  }

  if (exercise.goodTechnique !== true) {
    return keep('keep', 'Техника не подтверждена — закрепите текущую ступень.')
  }

  const allAtTop =
    sets.length >= exercise.targetSets && sets.every((set) => set.completedReps >= exercise.repMax)
  if (allAtTop) {
    const heavier = neighbourStep(exerciseId, stepId, 1)
    if (heavier) {
      return {
        kind: 'step-up',
        reason: `Все подходы на ${exercise.repMax}+ повторов — можно перейти на «${stepLabel(exerciseId, heavier)}».`,
        proposedStepId: heavier,
      }
    }
    return keep('top-step', 'Это самая тяжёлая ступень — замедлите опускание или добавьте паузу.')
  }

  return keep('add-reps', `Добавляйте повторы, пока все подходы не дойдут до ${exercise.repMax}.`)
}

export function evaluateExercise({ exercise, painReported, stopped }: ExerciseEvaluationInput): ProgressionDecision {
  const decision = baseDecision(exercise)
  if (decision.kind !== 'step-up') return decision
  if (painReported) {
    return {
      kind: 'pain-hold',
      reason: 'Была боль — нагрузку не повышаем. Если боль повторяется, обратитесь к специалисту.',
      proposedStepId: exercise.stepId,
    }
  }
  if (stopped) {
    return {
      kind: 'pain-hold',
      reason: 'Тренировка была остановлена — нагрузку не повышаем.',
      proposedStepId: exercise.stepId,
    }
  }
  return decision
}

// Pain during one exercise is a signal for the whole session, so a skip for
// pain blocks increases for every exercise, like pain in the final feedback.
export function hadPain(session: WorkoutSession): boolean {
  return session.feedback?.pain === true || session.exercises.some((e) => e.skipped?.reason === 'pain')
}

export function blocksIncrease(session: WorkoutSession): boolean {
  return session.status === 'stopped' || hadPain(session)
}

export function isActionable(suggestion: Pick<ProgressionSuggestion, 'currentStepId' | 'proposedStepId'>): boolean {
  return suggestion.currentStepId !== suggestion.proposedStepId
}

export function suggestProgression(session: WorkoutSession): ProgressionSuggestion[] {
  if (session.status === 'in-progress') return []
  const painReported = hadPain(session)
  const stopped = session.status === 'stopped'
  return session.exercises.map((exercise) => {
    const decision = evaluateExercise({ exercise, painReported, stopped })
    return {
      id: `${session.id}:${exercise.exerciseId}`,
      sessionId: session.id,
      exerciseId: exercise.exerciseId,
      kind: decision.kind,
      reason: decision.reason,
      currentStepId: exercise.stepId,
      proposedStepId: decision.proposedStepId,
    }
  })
}

export function applySuggestion(
  state: ProgressionState,
  suggestion: ProgressionSuggestion,
  now: string,
): ProgressionState {
  return { ...state, [suggestion.exerciseId]: { stepId: suggestion.proposedStepId, updatedAt: now } }
}

export function setStepManually(
  state: ProgressionState,
  exerciseId: ExerciseId,
  stepId: string,
  now: string,
): ProgressionState {
  if (stepIndex(exerciseId, stepId) === -1) throw new Error(`Unknown step ${stepId} for ${exerciseId}`)
  return { ...state, [exerciseId]: { stepId, updatedAt: now } }
}
