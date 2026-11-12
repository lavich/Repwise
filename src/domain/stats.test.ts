import { describe, expect, it } from 'vitest'
import { exerciseHistory, rpeSeries, sessionDays } from './stats'
import type { WorkoutSession } from './types'

const session = (id: string, startedAt: string, status: WorkoutSession['status'], rpe = 5): WorkoutSession => ({
  id,
  workoutId: 'A',
  startedAt,
  status,
  finishedAt: startedAt,
  feedback: { rpe, pain: false, notes: '' },
  exercises: [
    {
      exerciseId: 'band-squat',
      stepId: 'L2',
      repMin: 8,
      repMax: 12,
      perSide: false,
      targetSets: 3,
      sets: [{ setNumber: 1, repMin: 8, repMax: 12, completedReps: 10, completedAt: startedAt }],
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
    const days = sessionDays([session('a', '2026-11-02T08:00:00Z', 'completed'), session('b', '2026-11-02T09:00:00Z', 'stopped')])
    expect([...days.values()]).toEqual(['completed'])
  })

  it('collects previous results with their step', () => {
    expect(exerciseHistory([session('a', '2026-11-02T10:00:00Z', 'completed')], 'band-squat')).toMatchObject([
      { sessionId: 'a', reps: [10], totalReps: 10, stepId: 'L2' },
    ])
  })
})
