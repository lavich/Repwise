import { describe, expect, it } from 'vitest'
import { initialProgressionState } from './program'
import { setStepManually } from './progression'
import {
  completeSession,
  createSession,
  defaultReps,
  firstUnfinishedIndex,
  lastPerformance,
  recordSet,
  skipExercise,
  stopSession,
} from './session'
import type { WorkoutSession } from './types'

const NOW = '2026-11-12T10:00:00.000Z'
const feedback = { rpe: 6, pain: false, notes: '  ок  ' }

const newSession = (id = 's1', progression = initialProgressionState(NOW)) =>
  createSession({ id, workoutId: 'A', progression, now: NOW })

describe('createSession', () => {
  it('takes the step and rep range from the exercise state', () => {
    const progression = setStepManually(initialProgressionState(NOW), 'band-squat', 'L3', NOW)
    expect(newSession('s1', progression).exercises[0]).toMatchObject({
      exerciseId: 'band-squat',
      stepId: 'L3',
      repMin: 8,
      repMax: 12,
      targetSets: 3,
    })
  })
})

describe('session recording', () => {
  it('records sets in order and rejects extra sets', () => {
    let session = newSession()
    session = recordSet(session, 0, 12, NOW)
    session = recordSet(session, 0, 11, NOW)
    session = recordSet(session, 0, 10, NOW)
    expect(session.exercises[0]?.sets.map((s) => s.completedReps)).toEqual([12, 11, 10])
    expect(() => recordSet(session, 0, 12, NOW)).toThrow()
    expect(firstUnfinishedIndex(session)).toBe(1)
  })

  it('stores the skip reason', () => {
    const session = skipExercise(newSession(), 2, { reason: 'equipment', note: ' нет L3 ' })
    expect(session.exercises[2]?.skipped).toEqual({ reason: 'equipment', note: 'нет L3' })
  })
})

describe('session completion', () => {
  it('marks the session completed with normalized feedback', () => {
    const done = completeSession(newSession(), { ...feedback, rpe: 12 }, NOW)
    expect(done).toMatchObject({ status: 'completed', finishedAt: NOW, feedback: { rpe: 10, pain: false, notes: 'ок' } })
  })

  it('marks a stopped session separately and refuses further changes', () => {
    const stopped = stopSession(newSession(), feedback, NOW)
    expect(stopped.status).toBe('stopped')
    expect(() => recordSet(stopped, 0, 10, NOW)).toThrow()
  })
})

describe('last performance', () => {
  const finished = (id: string, reps: number[], stepId = 'L2', status: WorkoutSession['status'] = 'completed') => {
    let session = newSession(id)
    session = { ...session, exercises: session.exercises.map((e, i) => (i === 0 ? { ...e, stepId } : e)) }
    for (const r of reps) session = recordSet(session, 0, r, NOW)
    return { ...session, status }
  }

  it('returns the latest finished session on the same step', () => {
    const sessions = [finished('a', [9, 9, 8]), finished('b', [10, 9, 8], 'L3'), finished('c', [11, 10, 9])]
    expect(lastPerformance(sessions, 'band-squat', 'L2')).toEqual([11, 10, 9])
    expect(lastPerformance(sessions, 'band-squat', 'L3')).toEqual([10, 9, 8])
  })

  it('counts stopped sessions and ignores skipped exercises', () => {
    const skipped = { ...finished('b', []), exercises: [] }
    const sessions = [finished('a', [10], 'L2', 'stopped'), skipped]
    expect(lastPerformance(sessions, 'band-squat', 'L2')).toEqual([10])
  })

  it('falls back to the bottom of the range for missing sets', () => {
    expect(defaultReps([10], 1, 8)).toBe(10)
    expect(defaultReps([10], 2, 8)).toBe(8)
    expect(defaultReps(null, 1, 8)).toBe(8)
  })
})
