import { describe, expect, it } from 'vitest'
import { completedThisWeek, initialProgressionState, nextWorkoutId, WORKOUTS } from './program'
import type { WorkoutSession } from './types'

const session = (id: string, startedAt: Date, status: WorkoutSession['status'] = 'completed'): WorkoutSession => ({
  id,
  workoutId: 'A',
  startedAt: startedAt.toISOString(),
  status,
  exercises: [],
})

describe('program', () => {
  it('lists workout A and B exercises in order', () => {
    expect(WORKOUTS.A.exerciseIds[0]).toBe('band-squat')
    expect(WORKOUTS.B.exerciseIds[0]).toBe('bulgarian-split-squat')
    expect(WORKOUTS.A.exerciseIds).toHaveLength(8)
    expect(WORKOUTS.B.exerciseIds).toHaveLength(8)
  })

  it('shares push-ups between both workouts', () => {
    expect(WORKOUTS.A.exerciseIds).toContain('push-up')
    expect(WORKOUTS.B.exerciseIds).toContain('push-up')
  })

  it('starts every exercise on its default step', () => {
    const state = initialProgressionState('2026-11-12T10:00:00.000Z')
    expect(state['push-up'].stepId).toBe('floor')
    expect(state['band-squat'].stepId).toBe('L2')
  })

  it('alternates workouts and ignores stopped ones', () => {
    expect(nextWorkoutId([])).toBe('A')
    expect(nextWorkoutId([session('a', new Date(), 'stopped')])).toBe('A')
    expect(nextWorkoutId([session('a', new Date())])).toBe('B')
  })
})

describe('weekly goal', () => {
  const monday = new Date(2026, 10, 16, 9, 0)

  it('counts completed workouts from Monday to Sunday', () => {
    const sessions = [
      session('prev', new Date(2026, 10, 15, 12, 0)),
      session('mon', new Date(2026, 10, 16, 8, 0)),
      session('stop', new Date(2026, 10, 17, 8, 0), 'stopped'),
    ]
    expect(completedThisWeek(sessions, monday)).toBe(1)
  })

  it('assigns a workout to the week it started in', () => {
    const lateSunday = session('late', new Date(2026, 10, 15, 23, 40))
    expect(completedThisWeek([lateSunday], monday)).toBe(0)
    expect(completedThisWeek([lateSunday], new Date(2026, 10, 15, 23, 59))).toBe(1)
  })
})
