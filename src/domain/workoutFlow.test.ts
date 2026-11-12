import { describe, expect, it } from 'vitest'
import { createInitialData } from '@/storage/storage'
import { nextWorkoutId } from './program'
import type { AppData, SessionFeedback } from './types'
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
const easy: SessionFeedback = { rpe: 7, pain: false, notes: '' }

function runWorkout(data: AppData, id: string, reps: 'top' | 'bottom' | 'low', feedback = easy, stopAtTechnique = false): AppData {
  const started = startWorkout(data, id, NOW.toISOString())
  let active = started.activeWorkout
  if (!active) throw new Error('workout did not start')
  while (active.phase !== 'feedback') {
    if (active.phase === 'intro') active = beginExercise(active)
    else if (active.phase === 'set') {
      const exercise = active.session.exercises[active.exerciseIndex]!
      active = completeSet(active, reps === 'top' ? exercise.repMax : reps === 'low' ? exercise.repMin - 1 : exercise.repMin, 90, NOW)
    } else if (active.phase === 'rest') active = finishRest(active)
    else active = stopAtTechnique ? requestStop(active) : answerTechnique(active, true)
  }
  return finishWorkout({ ...started, activeWorkout: active }, feedback, NOW.toISOString())
}

describe('workout flow', () => {
  it('uses the exercise rest time for isolation exercises', () => {
    let data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString(), 'A')
    let active = data.activeWorkout!
    active = { ...active, exerciseIndex: 5 }
    active = completeSet(beginExercise(active), 12, 90, NOW)
    expect(active.restEndsAt).toBe('2026-11-12T10:01:00.000Z')
    data = startWorkout(createInitialData(NOW.toISOString()), 's2', NOW.toISOString(), 'A')
    active = completeSet(beginExercise(data.activeWorkout!), 10, 90, NOW)
    expect(active.restEndsAt).toBe('2026-11-12T10:01:30.000Z')
  })

  it('saves a completed session and alternates workouts', () => {
    const data = runWorkout(createInitialData(NOW.toISOString()), 's1', 'bottom')
    expect(data.activeWorkout).toBeNull()
    expect(data.sessions[0]?.status).toBe('completed')
    expect(nextWorkoutId(data.sessions)).toBe('B')
  })

  it('suggests a heavier step only after confirmation is needed', () => {
    const initial = createInitialData(NOW.toISOString())
    const data = runWorkout(initial, 's1', 'top')
    expect(data.progression).toEqual(initial.progression)
    const kinds = new Set(pendingActionableSuggestions(data).map((s) => s.kind))
    expect([...kinds]).toEqual(['step-up'])
  })

  it('withdraws pending step-ups after a workout with pain', () => {
    let data = runWorkout(createInitialData(NOW.toISOString()), 's1', 'top')
    expect(pendingActionableSuggestions(data).length).toBeGreaterThan(0)
    data = runWorkout(data, 's2', 'top', { ...easy, pain: true })
    expect(pendingActionableSuggestions(data)).toEqual([])
  })

  it('does not step up when stopped at the technique question', () => {
    const data = runWorkout(createInitialData(NOW.toISOString()), 's1', 'top', easy, true)
    expect(data.sessions[0]?.status).toBe('stopped')
    expect(pendingActionableSuggestions(data)).toEqual([])
  })

  it('saves a workout where every exercise was skipped as stopped', () => {
    let data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString())
    let active = data.activeWorkout!
    while (active.phase !== 'feedback') active = skipCurrentExercise(active, { reason: 'fatigue' })
    data = finishWorkout({ ...data, activeWorkout: active }, easy, NOW.toISOString())
    expect(data.sessions[0]?.status).toBe('stopped')
  })

  it('moves to the next exercise after a skip', () => {
    const data = startWorkout(createInitialData(NOW.toISOString()), 's1', NOW.toISOString())
    expect(skipCurrentExercise(data.activeWorkout!, { reason: 'pain' })).toMatchObject({ exerciseIndex: 1, phase: 'intro' })
  })

  it('keeps a pending suggestion when the next workout never reaches the exercise', () => {
    let data = runWorkout(createInitialData(NOW.toISOString()), 's1', 'low')
    const pushUp = pendingActionableSuggestions(data).find((s) => s.exerciseId === 'push-up')
    expect(pushUp?.kind).toBe('step-down')
    const next = startWorkout(data, 's2', NOW.toISOString())
    let active = next.activeWorkout!
    while (active.phase !== 'feedback') active = skipCurrentExercise(active, { reason: 'equipment' })
    data = finishWorkout({ ...next, activeWorkout: active }, easy, NOW.toISOString())
    expect(pendingActionableSuggestions(data).find((s) => s.exerciseId === 'push-up')).toEqual(pushUp)
  })

  it('keeps step-downs after a workout with pain', () => {
    const data = runWorkout(createInitialData(NOW.toISOString()), 's1', 'low', { ...easy, pain: true })
    const kinds = new Set(pendingActionableSuggestions(data).map((s) => s.kind))
    expect([...kinds]).toEqual(['step-down'])
  })

  it('hides a suggestion once the step was changed another way', () => {
    const data = runWorkout(createInitialData(NOW.toISOString()), 's1', 'top')
    const changed = { ...data, progression: { ...data.progression, 'band-squat': { stepId: 'L3', updatedAt: NOW.toISOString() } } }
    expect(pendingActionableSuggestions(changed).some((s) => s.exerciseId === 'band-squat')).toBe(false)
  })
})
