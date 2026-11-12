import { EXERCISES } from './exercises'
import { toLevel } from './program'
import {
  BAND_LEVELS,
  type BandLevel,
  type ExerciseId,
  type ExerciseProgression,
  type Level,
  type ProgressionDecisionKind,
  type ProgressionState,
  type ProgressionSuggestion,
  type SessionExercise,
  type SessionFeedback,
  type WorkoutSession,
} from './types'

export const COMFORTABLE_RPE_MAX = 6
export const HARD_RPE_MIN = 9

const INCREASES: ReadonlySet<ProgressionDecisionKind> = new Set(['progress', 'increase-band'])

export interface ExerciseEvaluationInput {
  exercise: SessionExercise
  feedback: SessionFeedback | undefined
  current: ExerciseProgression
  nextPlannedWeek: Level
}

export interface ProgressionDecision {
  kind: ProgressionDecisionKind
  reason: string
  proposed: ExerciseProgression
}

function bandIndex(band: BandLevel): number {
  return BAND_LEVELS.indexOf(band)
}

function defaultBand(exerciseId: ExerciseId): BandLevel | null {
  const equipment = EXERCISES[exerciseId].equipment
  return equipment.kind === 'band' ? equipment.band : null
}

// Only bands explicitly allowed for the exercise can be suggested; L3 is never
// allowed for any exercise, so the engine can never introduce it on its own.
function nextAllowedBand(exerciseId: ExerciseId, band: BandLevel | null): BandLevel | null {
  if (!band) return null
  const candidate = BAND_LEVELS[bandIndex(band) + 1]
  if (!candidate || candidate === 'L3') return null
  return EXERCISES[exerciseId].allowedBands.includes(candidate) ? candidate : null
}

function lighterAllowedBand(exerciseId: ExerciseId, band: BandLevel, base: BandLevel): BandLevel {
  const allowed = EXERCISES[exerciseId].allowedBands
  const candidates = BAND_LEVELS.slice(0, bandIndex(band)).filter((b) => allowed.includes(b))
  return candidates.at(-1) ?? base
}

function allSetsCompleted(exercise: SessionExercise): boolean {
  return (
    exercise.sets.length >= exercise.targetSets &&
    exercise.sets.every((set) => set.completedReps >= set.targetReps)
  )
}

const keep = (current: ExerciseProgression) => ({ ...current })

export function evaluateExercise({
  exercise,
  feedback,
  current,
  nextPlannedWeek,
}: ExerciseEvaluationInput): ProgressionDecision {
  const exerciseId = exercise.plannedExerciseId

  if (feedback?.pain || feedback?.dizzinessOrNausea) {
    return {
      kind: 'safety-hold',
      reason:
        'Была боль, головокружение или тошнота — нагрузку не повышаем. Если симптомы повторяются, обсудите программу с врачом.',
      proposed: keep(current),
    }
  }

  if (exercise.skipped) {
    const { reason } = exercise.skipped
    if (reason === 'pain' || reason === 'dizziness') {
      return {
        kind: 'safety-hold',
        reason: 'Упражнение пропущено из-за дискомфорта — нагрузку не повышаем.',
        proposed: keep(current),
      }
    }
    const alternativeId = EXERCISES[exerciseId].alternativeId
    if (reason === 'balance' && alternativeId && !current.useAlternative) {
      const alternative = EXERCISES[alternativeId]
      return {
        kind: 'use-alternative',
        reason: `Равновесие было неустойчивым — можно временно заменить на «${alternative.nameRu}».`,
        proposed: { ...current, useAlternative: true },
      }
    }
    return {
      kind: 'repeat',
      reason: 'Упражнение пропущено — в следующий раз повторите ту же нагрузку.',
      proposed: keep(current),
    }
  }

  if (exercise.sets.length === 0) {
    return { kind: 'repeat', reason: 'Упражнение не выполнялось — нагрузка не меняется.', proposed: keep(current) }
  }

  if (!feedback) {
    return { kind: 'repeat', reason: 'Нет оценки нагрузки — повторите текущий уровень.', proposed: keep(current) }
  }

  if (feedback.rpe >= HARD_RPE_MIN) {
    const base = defaultBand(exerciseId)
    if (current.band && base && bandIndex(current.band) > bandIndex(base)) {
      const lighter = lighterAllowedBand(exerciseId, current.band, base)
      return {
        kind: 'reduce',
        reason: `Очень тяжело (RPE ${feedback.rpe}) — вернитесь на ленту ${lighter}.`,
        proposed: { ...current, band: lighter },
      }
    }
    if (current.level > 1) {
      return {
        kind: 'reduce',
        reason: `Очень тяжело (RPE ${feedback.rpe}) — вернитесь к уровню предыдущей недели.`,
        proposed: { ...current, level: toLevel(current.level - 1) },
      }
    }
    return {
      kind: 'reduce',
      reason: `Очень тяжело (RPE ${feedback.rpe}) — это уже начальный уровень. Делайте меньше повторов или увеличьте отдых.`,
      proposed: keep(current),
    }
  }

  if (!allSetsCompleted(exercise) || exercise.goodTechnique === false) {
    if (current.level > 1) {
      return {
        kind: 'repeat',
        reason: 'Не все повторы выполнены с хорошей техникой — повторите нагрузку предыдущей недели.',
        proposed: { ...current, level: toLevel(current.level - 1) },
      }
    }
    return {
      kind: 'repeat',
      reason: 'Не все повторы выполнены с хорошей техникой — повторите текущую нагрузку.',
      proposed: keep(current),
    }
  }

  if (feedback.rpe > COMFORTABLE_RPE_MAX) {
    return {
      kind: 'repeat',
      reason: `Нагрузка ощутимая (RPE ${feedback.rpe}) — закрепите текущий уровень.`,
      proposed: keep(current),
    }
  }

  if (exercise.goodTechnique !== true) {
    return {
      kind: 'repeat',
      reason: 'Техника не оценена — повторите текущую нагрузку.',
      proposed: keep(current),
    }
  }

  if (current.level < nextPlannedWeek) {
    return {
      kind: 'progress',
      reason: 'Все подходы выполнены легко и с хорошей техникой — можно перейти на следующий уровень.',
      proposed: { ...current, level: toLevel(current.level + 1) },
    }
  }

  const heavierBand = current.level === 4 ? nextAllowedBand(exerciseId, current.band) : null
  if (heavierBand) {
    return {
      kind: 'increase-band',
      reason: `Текущая лента стала комфортной на максимальном объёме — можно попробовать ${heavierBand} с меньшим числом повторов.`,
      proposed: { ...current, band: heavierBand, level: 2 },
    }
  }

  return {
    kind: 'on-plan',
    reason: 'Вы идёте по плану — продолжайте с текущей нагрузкой.',
    proposed: keep(current),
  }
}

// Pain or dizziness during one exercise affects the whole body, so a skip for
// those reasons blocks progression for every exercise in the session.
export function hadSymptoms(session: WorkoutSession): boolean {
  const feedback = session.feedback
  if (feedback?.pain || feedback?.dizzinessOrNausea) return true
  return session.exercises.some((e) => e.skipped?.reason === 'pain' || e.skipped?.reason === 'dizziness')
}

export function blocksIncrease(session: WorkoutSession): boolean {
  return session.status === 'stopped' || hadSymptoms(session)
}

export function isIncrease(kind: ProgressionDecisionKind): boolean {
  return INCREASES.has(kind)
}

export function isActionable(suggestion: Pick<ProgressionSuggestion, 'current' | 'proposed'>): boolean {
  const { current, proposed } = suggestion
  return (
    current.level !== proposed.level ||
    current.band !== proposed.band ||
    current.useAlternative !== proposed.useAlternative
  )
}

export function suggestProgression(
  session: WorkoutSession,
  state: ProgressionState,
  nextPlannedWeek: Level,
): ProgressionSuggestion[] {
  if (session.status === 'in-progress') return []
  const feedback = hadSymptoms(session) && session.feedback ? { ...session.feedback, pain: true } : session.feedback
  const stopped = session.status === 'stopped'
  return session.exercises.map((exercise) => {
    const current = state[exercise.plannedExerciseId]
    let decision = evaluateExercise({ exercise, feedback, current, nextPlannedWeek })
    if (stopped && isIncrease(decision.kind)) {
      decision = {
        kind: 'safety-hold',
        reason: 'Тренировка была остановлена — нагрузку не повышаем.',
        proposed: keep(current),
      }
    }
    return {
      id: `${session.id}:${exercise.plannedExerciseId}`,
      sessionId: session.id,
      exerciseId: exercise.plannedExerciseId,
      kind: decision.kind,
      reason: decision.reason,
      current,
      proposed: decision.proposed,
    }
  })
}

export function applySuggestion(
  state: ProgressionState,
  suggestion: ProgressionSuggestion,
  now: string,
): ProgressionState {
  return { ...state, [suggestion.exerciseId]: { ...suggestion.proposed, updatedAt: now } }
}

export type ManualProgressionChange = Partial<Pick<ExerciseProgression, 'level' | 'band' | 'useAlternative'>>

export function setProgressionManually(
  state: ProgressionState,
  exerciseId: ExerciseId,
  change: ManualProgressionChange,
  now: string,
): ProgressionState {
  const current = state[exerciseId]
  const next: ExerciseProgression = { ...current, ...change, updatedAt: now }
  const base = defaultBand(exerciseId)
  if (base === null) next.band = null
  else if (next.band === null) next.band = current.band ?? base
  if (!EXERCISES[exerciseId].alternativeId) next.useAlternative = false
  return { ...state, [exerciseId]: next }
}
