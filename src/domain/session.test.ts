import { describe, expect, it } from 'vitest'
import { initialProgressionState } from './program'
import { setProgressionManually } from './progression'
import {
  completeSession,
  createSession,
  firstUnfinishedIndex,
  recordSet,
  skipExercise,
  stopSession,
  switchToAlternative,
} from './session'

const NOW = '2026-11-12T10:00:00.000Z'
const feedback = { rpe: 6, pain: false, dizzinessOrNausea: false, notes: '  ок  ' }

const newSession = (progression = initialProgressionState(NOW)) =>
  createSession({ id: 's1', workoutId: 'A', programWeek: 1, progression, now: NOW })

describe('createSession', () => {
  it('takes targets from the exercise level, not the calendar week', () => {
    const progression = setProgressionManually(initialProgressionState(NOW), 'banded-squat', { level: 3 }, NOW)
    const session = createSession({ id: 's1', workoutId: 'A', programWeek: 1, progression, now: NOW })
    expect(session.exercises[0]).toMatchObject({ plannedExerciseId: 'banded-squat', targetSets: 3, targetReps: 15, band: 'L1' })
  })

  it('performs Sit to Stand instead of the lunge when the alternative is enabled', () => {
    const progression = setProgressionManually(
      initialProgressionState(NOW),
      'supported-reverse-lunge',
      { useAlternative: true },
      NOW,
    )
    const session = createSession({ id: 's1', workoutId: 'B', programWeek: 1, progression, now: NOW })
    expect(session.exercises[0]).toMatchObject({
      plannedExerciseId: 'supported-reverse-lunge',
      performedExerciseId: 'sit-to-stand',
    })
  })
})

describe('session recording', () => {
  it('records sets in order and rejects extra sets', () => {
    let session = newSession()
    session = recordSet(session, 0, 12, NOW)
    session = recordSet(session, 0, 11, NOW)
    expect(session.exercises[0]?.sets.map((s) => [s.setNumber, s.completedReps])).toEqual([
      [1, 12],
      [2, 11],
    ])
    expect(() => recordSet(session, 0, 12, NOW)).toThrow()
    expect(firstUnfinishedIndex(session)).toBe(1)
  })

  it('stores the skip reason', () => {
    const session = skipExercise(newSession(), 2, { reason: 'dizziness', note: ' кружилась голова ' })
    expect(session.exercises[2]?.skipped).toEqual({ reason: 'dizziness', note: 'кружилась голова' })
  })

  it('only switches exercises that have an alternative', () => {
    expect(() => switchToAlternative(newSession(), 0)).toThrow()
  })
})

describe('session completion', () => {
  it('marks the session completed with normalized feedback', () => {
    const done = completeSession(newSession(), { ...feedback, rpe: 12 }, '2026-11-12T10:40:00.000Z')
    expect(done.status).toBe('completed')
    expect(done.finishedAt).toBe('2026-11-12T10:40:00.000Z')
    expect(done.feedback).toEqual({ rpe: 10, pain: false, dizzinessOrNausea: false, notes: 'ок' })
  })

  it('marks a stopped session separately', () => {
    expect(stopSession(newSession(), feedback, NOW).status).toBe('stopped')
  })

  it('refuses to change a finished session', () => {
    const done = completeSession(newSession(), feedback, NOW)
    expect(() => completeSession(done, feedback, NOW)).toThrow()
    expect(() => recordSet(done, 0, 10, NOW)).toThrow()
  })
})
