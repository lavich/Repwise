import { describe, expect, it } from 'vitest'
import { initialProgressionState } from './program'
import { applySuggestion, evaluateExercise, isActionable, setStepManually, suggestProgression } from './progression'
import type { ExerciseId, SessionExercise, WorkoutSession } from './types'

const NOW = '2026-11-12T10:00:00.000Z'

function performed(
  exerciseId: ExerciseId,
  stepId: string,
  reps: number[],
  options: { min?: number; max?: number; goodTechnique?: boolean | null } = {},
): SessionExercise {
  const repMin = options.min ?? 8
  const repMax = options.max ?? 12
  return {
    exerciseId,
    stepId,
    repMin,
    repMax,
    perSide: false,
    targetSets: 3,
    sets: reps.map((completedReps, i) => ({ setNumber: i + 1, repMin, repMax, completedReps, completedAt: NOW })),
    goodTechnique: options.goodTechnique === undefined ? true : options.goodTechnique,
  }
}

const evaluate = (exercise: SessionExercise, painReported = false, stopped = false) =>
  evaluateExercise({ exercise, painReported, stopped })

describe('double progression', () => {
  it('steps up when every set reaches the top of the range', () => {
    const decision = evaluate(performed('band-squat', 'L2', [12, 12, 13]))
    expect(decision).toMatchObject({ kind: 'step-up', proposedStepId: 'L1+L2' })
  })

  it('keeps the step while reps are inside the range', () => {
    const decision = evaluate(performed('band-squat', 'L2', [12, 11, 10]))
    expect(decision).toMatchObject({ kind: 'add-reps', proposedStepId: 'L2' })
  })

  it('steps down when the first set is below the range', () => {
    const decision = evaluate(performed('push-up', 'floor', [4, 4, 3], { min: 6 }))
    expect(decision).toMatchObject({ kind: 'step-down', proposedStepId: 'incline' })
  })

  it('stays on the easiest step when the first set is below the range there', () => {
    const decision = evaluate(performed('push-up', 'incline', [3, 3, 3], { min: 6 }))
    expect(decision).toMatchObject({ kind: 'bottom-step', proposedStepId: 'incline' })
  })

  it('suggests tempo instead of a heavier step on the last step', () => {
    const decision = evaluate(performed('band-lateral-raise', 'L1-pause', [20, 20, 20], { min: 12, max: 20 }))
    expect(decision).toMatchObject({ kind: 'top-step', proposedStepId: 'L1-pause' })
  })

  it('needs every planned set before stepping up', () => {
    expect(evaluate(performed('band-squat', 'L2', [12, 12])).kind).toBe('add-reps')
  })

  it.each([false, null])('does not step up when technique is %s', (goodTechnique) => {
    const decision = evaluate(performed('band-squat', 'L2', [12, 12, 12], { goodTechnique }))
    expect(decision).toMatchObject({ kind: 'keep', proposedStepId: 'L2' })
  })

  it('keeps the step for a skipped exercise', () => {
    const exercise = { ...performed('band-squat', 'L2', []), skipped: { reason: 'fatigue' as const } }
    expect(evaluate(exercise)).toMatchObject({ kind: 'keep', proposedStepId: 'L2' })
  })
})

describe('safety', () => {
  it('blocks a step up after pain', () => {
    const decision = evaluate(performed('band-squat', 'L2', [12, 12, 12]), true)
    expect(decision).toMatchObject({ kind: 'pain-hold', proposedStepId: 'L2' })
  })

  it('still allows a step down after pain', () => {
    const decision = evaluate(performed('push-up', 'floor', [4, 5, 5], { min: 6 }), true)
    expect(decision).toMatchObject({ kind: 'step-down', proposedStepId: 'incline' })
  })

  it('blocks a step up in a stopped session', () => {
    expect(evaluate(performed('band-squat', 'L2', [12, 12, 12]), false, true).kind).toBe('pain-hold')
  })

  it('holds every exercise when one was skipped because of pain', () => {
    const session: WorkoutSession = {
      id: 's1',
      workoutId: 'A',
      startedAt: NOW,
      status: 'completed',
      exercises: [
        performed('band-squat', 'L2', [12, 12, 12]),
        { ...performed('push-up', 'floor', []), skipped: { reason: 'pain' } },
      ],
      feedback: { rpe: 5, pain: false, notes: '' },
    }
    expect(suggestProgression(session).map((s) => s.kind)).toEqual(['pain-hold', 'keep'])
  })

  it('ignores RPE', () => {
    const session: WorkoutSession = {
      id: 's1',
      workoutId: 'A',
      startedAt: NOW,
      status: 'completed',
      exercises: [performed('band-squat', 'L2', [12, 12, 12])],
      feedback: { rpe: 10, pain: false, notes: '' },
    }
    expect(suggestProgression(session)[0]?.kind).toBe('step-up')
  })
})

describe('applying suggestions', () => {
  const session: WorkoutSession = {
    id: 's1',
    workoutId: 'A',
    startedAt: NOW,
    status: 'completed',
    exercises: [performed('band-squat', 'L2', [12, 12, 12])],
    feedback: { rpe: 7, pain: false, notes: '' },
  }

  it('judges against the step recorded in the session', () => {
    const [suggestion] = suggestProgression({ ...session, exercises: [performed('band-squat', 'L1', [12, 12, 12])] })
    expect(suggestion).toMatchObject({ currentStepId: 'L1', proposedStepId: 'L2' })
  })

  it('changes the step only when a suggestion is applied', () => {
    const state = initialProgressionState(NOW)
    const [suggestion] = suggestProgression(session)
    if (!suggestion) throw new Error('expected a suggestion')
    expect(isActionable(suggestion)).toBe(true)
    expect(state['band-squat'].stepId).toBe('L2')
    expect(applySuggestion(state, suggestion, NOW)['band-squat'].stepId).toBe('L1+L2')
  })

  it('lets the user pick any step manually', () => {
    const next = setStepManually(initialProgressionState(NOW), 'bent-over-band-row', 'L2+L3', NOW)
    expect(next['bent-over-band-row'].stepId).toBe('L2+L3')
  })

  it('rejects a step that is not on the ladder', () => {
    expect(() => setStepManually(initialProgressionState(NOW), 'push-up', 'L3', NOW)).toThrow()
  })
})
