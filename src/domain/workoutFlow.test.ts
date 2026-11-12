import { describe, expect, it } from 'vitest'
import { createInitialData } from '@/storage/storage'
import { programWeekAfter, nextWorkoutId } from './program'
import { applySuggestion } from './progression'
import type { AppData } from './types'
import {
  answerTechnique,
  beginExercise,
  completeSet,
  finishRest,
  finishWorkout,
  pendingActionableSuggestions,
  requestStop,
  skipCurrentExercise,
  startWorkout,
} from './workoutFlow'

const NOW = new Date('2026-11-12T10:00:00.000Z')
const easy = { rpe: 5, pain: false, dizzinessOrNausea: false, notes: '' }

function runFullWorkout(data: AppData, id: string, feedback = easy, stopAt?: 'technique'): AppData {
  let next = startWorkout(data, id, NOW.toISOString())
  let active = next.activeWorkout
  if (!active) throw new Error('workout did not start')
  while (active.phase !== 'feedback') {
    if (active.phase === 'intro') active = beginExercise(active)
    else if (active.phase === 'set') {
      const exercise = active.session.exercises[active.exerciseIndex]
      if (!exercise) throw new Error('missing exercise')
      active = completeSet(active, exercise.targetReps, 60, NOW)
    } else if (active.phase === 'rest') active = finishRest(active)
    else if (active.phase === 'technique') {
      if (stopAt === 'technique') active = requestStop(active)
      else active = answerTechnique(active, true)
    }
  }
  next = { ...next, activeWorkout: active }
  return finishWorkout(next, feedback, NOW.toISOString())
}

describe('program schedule', () => {
  it('advances the week every two completed workouts and caps at week 4', () => {
    expect([0, 1, 2, 3, 6, 7, 8, 20].map(programWeekAfter)).toEqual([1, 1, 2, 2, 4, 4, 4, 4])
  })

  it('alternates workouts A and B', () => {
    let data = createInitialData(NOW.toISOString())
    expect(nextWorkoutId(data.sessions)).toBe('A')
    data = runFullWorkout(data, 's1')
    expect(nextWorkoutId(data.sessions)).toBe('B')
  })
})

describe('workout flow', () => {
  it('starts a rest timer between sets and asks about technique after the last one', () => {
    const data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString())
    let active = beginExercise(data.activeWorkout!)
    active = completeSet(active, 12, 75, NOW)
    expect(active.phase).toBe('rest')
    expect(active.restEndsAt).toBe('2026-11-12T10:01:15.000Z')
    active = completeSet(finishRest(active), 12, 75, NOW)
    expect(active.phase).toBe('technique')
  })

  it('moves to the next exercise after a skip', () => {
    const data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString())
    const active = skipCurrentExercise(data.activeWorkout!, { reason: 'pain' })
    expect(active).toMatchObject({ exerciseIndex: 1, phase: 'intro' })
  })

  it('saves a completed session to history and clears the active workout', () => {
    const data = runFullWorkout(createInitialData(NOW.toISOString()), 's1')
    expect(data.activeWorkout).toBeNull()
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0]?.status).toBe('completed')
  })

  it('does not change progression until a suggestion is confirmed', () => {
    const initial = createInitialData(NOW.toISOString())
    let data = runFullWorkout(initial, 's1')
    data = runFullWorkout(data, 's2')
    expect(data.progression).toEqual(initial.progression)
    expect(pendingActionableSuggestions(data).every((s) => s.kind === 'progress')).toBe(true)
    expect(pendingActionableSuggestions(data)).toHaveLength(10)
  })

  it('suggests no progression after dizziness', () => {
    let data = runFullWorkout(createInitialData(NOW.toISOString()), 's1')
    data = runFullWorkout(data, 's2', { ...easy, dizzinessOrNausea: true })
    expect(pendingActionableSuggestions(data)).toEqual([])
    expect(data.pendingSuggestions.filter((s) => s.sessionId === 's2').every((s) => s.kind === 'safety-hold')).toBe(true)
  })

  it('saves a stopped workout without counting it towards the program', () => {
    let data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString())
    data = { ...data, activeWorkout: requestStop(data.activeWorkout!) }
    data = finishWorkout(data, { ...easy, dizzinessOrNausea: true }, NOW.toISOString())
    expect(data.sessions[0]?.status).toBe('stopped')
    expect(nextWorkoutId(data.sessions)).toBe('A')
  })
})

function acceptAll(data: AppData): AppData {
  return pendingActionableSuggestions(data).reduce(
    (acc, s) => ({ ...acc, progression: applySuggestion(acc.progression, s, NOW.toISOString()), pendingSuggestions: [] }),
    data,
  )
}

describe('progression over the program', () => {
  it('reaches the week 4 level for both workouts when every easy suggestion is accepted', () => {
    let data = createInitialData(NOW.toISOString())
    const levels: Record<string, number[]> = { A: [], B: [] }
    for (let i = 0; i < 8; i++) {
      const started = startWorkout(data, `pre-${i}`, NOW.toISOString())
      const session = started.activeWorkout!.session
      levels[session.workoutId]!.push(session.exercises[0]!.level)
      data = acceptAll(runFullWorkout(data, `s${i}`))
    }
    expect(levels).toEqual({ A: [1, 2, 3, 4], B: [1, 2, 3, 4] })
  })

  it('withdraws earlier increase suggestions after a workout with dizziness', () => {
    let data = runFullWorkout(createInitialData(NOW.toISOString()), 's1')
    data = runFullWorkout(data, 's2')
    expect(pendingActionableSuggestions(data).length).toBeGreaterThan(0)
    data = runFullWorkout(data, 's3', { ...easy, dizzinessOrNausea: true })
    expect(pendingActionableSuggestions(data).filter((s) => s.kind === 'progress')).toEqual([])
  })

  it('does not suggest an increase when the workout was stopped', () => {
    const data = runFullWorkout(createInitialData(NOW.toISOString()), 's1', easy, 'technique')
    expect(data.sessions[0]?.status).toBe('stopped')
    expect(data.pendingSuggestions.some((s) => s.kind === 'progress' || s.kind === 'increase-band')).toBe(false)
  })

  it('does not lower exercises that were never attempted before a stop', () => {
    let data = createInitialData(NOW.toISOString())
    for (const id of Object.keys(data.progression) as (keyof typeof data.progression)[]) {
      data.progression[id] = { ...data.progression[id], level: 3 }
    }
    data = startWorkout(data, 's1', NOW.toISOString())
    data = { ...data, activeWorkout: requestStop(data.activeWorkout!) }
    data = finishWorkout(data, { ...easy, rpe: 4 }, NOW.toISOString())
    expect(pendingActionableSuggestions(data)).toEqual([])
  })

  it('saves a workout where every exercise was skipped as stopped', () => {
    let data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString())
    let active = data.activeWorkout!
    while (active.phase !== 'feedback') active = skipCurrentExercise(active, { reason: 'fatigue' })
    data = finishWorkout({ ...data, activeWorkout: active }, easy, NOW.toISOString())
    expect(data.sessions[0]?.status).toBe('stopped')
    expect(nextWorkoutId(data.sessions)).toBe('A')
  })
})
