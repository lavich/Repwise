import { describe, expect, it } from 'vitest'
import { exerciseHistory, rpeSeries, sessionDays } from './stats'
import type { WorkoutSession } from './types'

const session = (id: string, startedAt: string, status: WorkoutSession['status'], rpe = 5): WorkoutSession => ({
  id,
  workoutId: 'A',
  programWeek: 1,
  startedAt,
  status,
  finishedAt: startedAt,
  feedback: { rpe, pain: false, dizzinessOrNausea: false, notes: '' },
  exercises: [
    {
      plannedExerciseId: 'banded-squat',
      performedExerciseId: 'banded-squat',
      level: 1,
      band: 'L1',
      targetSets: 2,
      targetReps: 12,
      sets: [{ setNumber: 1, targetReps: 12, completedReps: 10, completedAt: startedAt }],
      goodTechnique: true,
    },
  ],
})

describe('stats', () => {
  it('orders RPE points chronologically', () => {
    const points = rpeSeries([session('b', '2026-11-05T10:00:00Z', 'completed', 7), session('a', '2026-11-02T10:00:00Z', 'completed', 5)])
    expect(points.map((p) => p.value)).toEqual([5, 7])
  })

  it('prefers a completed session over a stopped one on the same day', () => {
    const days = sessionDays([session('a', '2026-11-02T08:00:00', 'completed'), session('b', '2026-11-02T18:00:00', 'stopped')])
    expect(days.get('2026-11-02')).toBe('completed')
  })

  it('collects previous results for an exercise', () => {
    expect(exerciseHistory([session('a', '2026-11-02T10:00:00Z', 'completed')], 'banded-squat')).toMatchObject([
      { sessionId: 'a', reps: [10], totalReps: 10, band: 'L1' },
    ])
  })
})
