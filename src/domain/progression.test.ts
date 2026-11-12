import { describe, expect, it } from 'vitest'
import { initialExerciseProgression } from './program'
import { applySuggestion, evaluateExercise, isActionable, setProgressionManually, suggestProgression } from './progression'
import { initialProgressionState } from './program'
import type { ExerciseId, ExerciseProgression, Level, SessionExercise, SessionFeedback, WorkoutSession } from './types'

const NOW = '2026-11-12T10:00:00.000Z'

function performed(
  exerciseId: ExerciseId,
  options: { sets?: number; reps?: number; completedReps?: number[]; level?: Level; goodTechnique?: boolean } = {},
): SessionExercise {
  const targetSets = options.sets ?? 2
  const targetReps = options.reps ?? 12
  const completed = options.completedReps ?? Array.from({ length: targetSets }, () => targetReps)
  return {
    plannedExerciseId: exerciseId,
    performedExerciseId: exerciseId,
    level: options.level ?? 1,
    band: null,
    targetSets,
    targetReps,
    sets: completed.map((reps, i) => ({ setNumber: i + 1, targetReps, completedReps: reps, completedAt: NOW })),
    goodTechnique: options.goodTechnique ?? true,
  }
}

const feedback = (rpe: number, extra: Partial<SessionFeedback> = {}): SessionFeedback => ({
  rpe,
  pain: false,
  dizzinessOrNausea: false,
  notes: '',
  ...extra,
})

const state = (exerciseId: ExerciseId, patch: Partial<ExerciseProgression> = {}): ExerciseProgression => ({
  ...initialExerciseProgression(exerciseId, NOW),
  ...patch,
})

describe('evaluateExercise: RPE', () => {
  it('suggests the next level when all sets were easy and the plan has moved on', () => {
    const decision = evaluateExercise({
      exercise: performed('dead-bug'),
      feedback: feedback(5),
      current: state('dead-bug'),
      nextPlannedWeek: 2,
    })
    expect(decision.kind).toBe('progress')
    expect(decision.proposed.level).toBe(2)
  })

  it('treats RPE 6 as comfortable', () => {
    const decision = evaluateExercise({
      exercise: performed('dead-bug'),
      feedback: feedback(6),
      current: state('dead-bug'),
      nextPlannedWeek: 2,
    })
    expect(decision.kind).toBe('progress')
  })

  it('never progresses beyond the planned week', () => {
    const decision = evaluateExercise({
      exercise: performed('dead-bug'),
      feedback: feedback(4),
      current: state('dead-bug'),
      nextPlannedWeek: 1,
    })
    expect(decision.kind).toBe('on-plan')
    expect(decision.proposed.level).toBe(1)
  })

  it.each([7, 8])('repeats the current level at RPE %i', (rpe) => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat'),
      feedback: feedback(rpe),
      current: state('banded-squat', { level: 2 }),
      nextPlannedWeek: 3,
    })
    expect(decision.kind).toBe('repeat')
    expect(decision.proposed.level).toBe(2)
  })

  it.each([9, 10])('suggests reducing the level at RPE %i', (rpe) => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat'),
      feedback: feedback(rpe),
      current: state('banded-squat', { level: 3 }),
      nextPlannedWeek: 4,
    })
    expect(decision.kind).toBe('reduce')
    expect(decision.proposed.level).toBe(2)
  })

  it('reduces the band before the level when a heavier band is in use', () => {
    const decision = evaluateExercise({
      exercise: performed('glute-bridge'),
      feedback: feedback(9),
      current: state('glute-bridge', { level: 2, band: 'L2' }),
      nextPlannedWeek: 4,
    })
    expect(decision.kind).toBe('reduce')
    expect(decision.proposed).toMatchObject({ band: 'L1', level: 2 })
  })

  it('suggests reducing even when sets were not completed', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { completedReps: [12, 6] }),
      feedback: feedback(10),
      current: state('banded-squat', { level: 2 }),
      nextPlannedWeek: 2,
    })
    expect(decision.kind).toBe('reduce')
  })
})

describe('evaluateExercise: completion and technique', () => {
  it('returns to the previous week when reps were missed', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { completedReps: [12, 10] }),
      feedback: feedback(5),
      current: state('banded-squat', { level: 2 }),
      nextPlannedWeek: 3,
    })
    expect(decision.kind).toBe('repeat')
    expect(decision.proposed.level).toBe(1)
  })

  it('does not progress when technique was poor', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { goodTechnique: false }),
      feedback: feedback(4),
      current: state('banded-squat'),
      nextPlannedWeek: 2,
    })
    expect(decision.kind).toBe('repeat')
    expect(decision.proposed.level).toBe(1)
  })

  it('does not progress when fewer sets than planned were recorded', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { sets: 3, completedReps: [12, 12] }),
      feedback: feedback(4),
      current: state('banded-squat'),
      nextPlannedWeek: 2,
    })
    expect(decision.kind).toBe('repeat')
  })
})

describe('evaluateExercise: safety', () => {
  it.each([
    ['pain', { pain: true }],
    ['dizziness or nausea', { dizzinessOrNausea: true }],
  ] as const)('holds progression after %s even with an easy RPE', (_, extra) => {
    const decision = evaluateExercise({
      exercise: performed('dead-bug'),
      feedback: feedback(3, extra),
      current: state('dead-bug'),
      nextPlannedWeek: 4,
    })
    expect(decision.kind).toBe('safety-hold')
    expect(decision.proposed).toEqual(state('dead-bug'))
  })

  it.each(['pain', 'dizziness'] as const)('holds progression for an exercise skipped because of %s', (reason) => {
    const decision = evaluateExercise({
      exercise: { ...performed('banded-squat', { completedReps: [] }), skipped: { reason } },
      feedback: feedback(3),
      current: state('banded-squat'),
      nextPlannedWeek: 4,
    })
    expect(decision.kind).toBe('safety-hold')
  })

  it('offers Sit to Stand when the lunge was skipped because of balance', () => {
    const decision = evaluateExercise({
      exercise: { ...performed('supported-reverse-lunge', { completedReps: [] }), skipped: { reason: 'balance' } },
      feedback: feedback(5),
      current: state('supported-reverse-lunge'),
      nextPlannedWeek: 1,
    })
    expect(decision.kind).toBe('use-alternative')
    expect(decision.proposed.useAlternative).toBe(true)
  })
})

describe('evaluateExercise: bands', () => {
  it('suggests L2 for squats only after the top level is comfortable', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { sets: 3, reps: 15, level: 4 }),
      feedback: feedback(5),
      current: state('banded-squat', { level: 4 }),
      nextPlannedWeek: 4,
    })
    expect(decision.kind).toBe('increase-band')
    expect(decision.proposed.band).toBe('L2')
  })

  it('does not suggest a heavier band below the top level', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { sets: 3, reps: 15, level: 3 }),
      feedback: feedback(5),
      current: state('banded-squat', { level: 3 }),
      nextPlannedWeek: 3,
    })
    expect(decision.proposed.band).toBe('L1')
  })

  it('does not suggest L2 for exercises where it is not allowed', () => {
    const decision = evaluateExercise({
      exercise: performed('lateral-band-walk', { sets: 3, reps: 15, level: 4 }),
      feedback: feedback(3),
      current: state('lateral-band-walk', { level: 4 }),
      nextPlannedWeek: 4,
    })
    expect(decision.kind).toBe('on-plan')
    expect(decision.proposed.band).toBe('L1')
  })

  it('never introduces L3 automatically', () => {
    const decision = evaluateExercise({
      exercise: performed('banded-squat', { sets: 3, reps: 15, level: 4 }),
      feedback: feedback(2),
      current: state('banded-squat', { level: 4, band: 'L2' }),
      nextPlannedWeek: 4,
    })
    expect(decision.proposed.band).toBe('L2')
    expect(decision.kind).toBe('on-plan')
  })
})

describe('suggestProgression', () => {
  const session: WorkoutSession = {
    id: 's1',
    workoutId: 'A',
    programWeek: 1,
    startedAt: NOW,
    finishedAt: NOW,
    status: 'completed',
    exercises: [performed('banded-squat'), performed('dead-bug', { sets: 2, reps: 8 })],
    feedback: feedback(5),
  }

  it('returns one suggestion per exercise without changing the state', () => {
    const progression = initialProgressionState(NOW)
    const suggestions = suggestProgression(session, progression, 2)
    expect(suggestions.map((s) => s.exerciseId)).toEqual(['banded-squat', 'dead-bug'])
    expect(progression['banded-squat'].level).toBe(1)
  })

  it('returns nothing for a session that is still in progress', () => {
    expect(suggestProgression({ ...session, status: 'in-progress' }, initialProgressionState(NOW), 2)).toEqual([])
  })

  it('applies a suggestion only when explicitly confirmed', () => {
    const progression = initialProgressionState(NOW)
    const [suggestion] = suggestProgression(session, progression, 2)
    if (!suggestion) throw new Error('expected a suggestion')
    expect(isActionable(suggestion)).toBe(true)
    const next = applySuggestion(progression, suggestion, '2026-11-13T10:00:00.000Z')
    expect(next['banded-squat'].level).toBe(2)
    expect(next['glute-bridge']).toEqual(progression['glute-bridge'])
  })
})

describe('setProgressionManually', () => {
  it('lets the user override level and band', () => {
    const next = setProgressionManually(initialProgressionState(NOW), 'banded-squat', { level: 3, band: 'L2' }, NOW)
    expect(next['banded-squat']).toMatchObject({ level: 3, band: 'L2' })
  })

  it('keeps bodyweight exercises without a band', () => {
    const next = setProgressionManually(initialProgressionState(NOW), 'dead-bug', { band: 'L2' }, NOW)
    expect(next['dead-bug'].band).toBeNull()
  })
})

describe('safety edge cases', () => {
  it('does not progress when the technique question was not answered', () => {
    const exercise = { ...performed('dead-bug'), goodTechnique: null }
    const decision = evaluateExercise({ exercise, feedback: feedback(4), current: state('dead-bug'), nextPlannedWeek: 2 })
    expect(decision.proposed.level).toBe(1)
  })

  it('holds every exercise when one was skipped because of dizziness', () => {
    const session: WorkoutSession = {
      id: 's1',
      workoutId: 'A',
      programWeek: 1,
      startedAt: NOW,
      status: 'completed',
      exercises: [performed('banded-squat'), { ...performed('dead-bug', { completedReps: [] }), skipped: { reason: 'dizziness' } }],
      feedback: feedback(4),
    }
    const kinds = suggestProgression(session, initialProgressionState(NOW), 4).map((s) => s.kind)
    expect(kinds).toEqual(['safety-hold', 'safety-hold'])
  })

  it('steps down to a band the exercise allows', () => {
    const decision = evaluateExercise({
      exercise: performed('lateral-band-walk'),
      feedback: feedback(9),
      current: state('lateral-band-walk', { band: 'L3' }),
      nextPlannedWeek: 1,
    })
    expect(decision.proposed.band).toBe('L1')
  })

  it('keeps a band on band exercises when a manual change clears it', () => {
    const next = setProgressionManually(initialProgressionState(NOW), 'banded-squat', { band: null }, NOW)
    expect(next['banded-squat'].band).toBe('L1')
  })
})
