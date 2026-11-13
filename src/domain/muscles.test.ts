import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { createSession, recordSet, skipExercise } from './session'
import { initialProgressionState } from './program'
import { loadLevel, rankedMuscleLoad, weeklyMuscleSets } from './stats'
import { EXERCISE_IDS, MUSCLE_IDS, type WorkoutSession } from './types'
import { formatSetCount } from '@/lib/format'

const monday = new Date(2026, 10, 16, 9, 0)

function sessionWith(
  workoutId: 'A' | 'B',
  startedAt: Date,
  setsByIndex: Record<number, number>,
  status: WorkoutSession['status'] = 'completed',
): WorkoutSession {
  let session = createSession({ id: startedAt.toISOString(), workoutId, progression: initialProgressionState(startedAt.toISOString()), now: startedAt.toISOString() })
  for (const [index, count] of Object.entries(setsByIndex)) {
    for (let i = 0; i < count; i++) session = recordSet(session, Number(index), 10, startedAt.toISOString())
  }
  return { ...session, status }
}

describe('exercise muscles', () => {
  it.each(EXERCISE_IDS)('%s has distinct primary and secondary muscles', (id) => {
    const { primary, secondary } = EXERCISES[id].muscles
    expect(primary.length).toBeGreaterThan(0)
    const all = [...primary, ...secondary]
    expect(new Set(all).size).toBe(all.length)
    expect(all.every((m) => MUSCLE_IDS.includes(m))).toBe(true)
  })
})

describe('weekly muscle load', () => {
  it('counts primary muscles fully and secondary ones by half', () => {
    const squats = sessionWith('A', new Date(2026, 10, 16, 8, 0), { 0: 3 })
    const lunges = sessionWith('B', new Date(2026, 10, 17, 8, 0), { 0: 3 })
    const load = weeklyMuscleSets([squats, lunges], monday)
    expect(load).toMatchObject({ quads: 6, glutes: 6, adductors: 3, 'lower-back': 1.5, hamstrings: 1.5 })
  })

  it('ignores last week and counts a session by its start', () => {
    const lastSunday = sessionWith('A', new Date(2026, 10, 15, 23, 40), { 0: 3 })
    expect(weeklyMuscleSets([lastSunday], monday).quads).toBe(0)
    expect(weeklyMuscleSets([lastSunday], new Date(2026, 10, 15, 23, 59)).quads).toBe(3)
  })

  it('counts stopped sessions and sets recorded before a skip, but not skipped exercises', () => {
    let session = sessionWith('A', new Date(2026, 10, 16, 8, 0), { 0: 1 }, 'in-progress')
    session = skipExercise(session, 0, { reason: 'fatigue' })
    session = skipExercise(session, 1, { reason: 'equipment' })
    const load = weeklyMuscleSets([{ ...session, status: 'stopped' }], monday)
    expect(load.quads).toBe(1)
    expect(load.chest).toBe(0)
  })

  it('counts a per-side set once', () => {
    const lunges = sessionWith('B', new Date(2026, 10, 16, 8, 0), { 0: 1 })
    expect(weeklyMuscleSets([lunges], monday).quads).toBe(1)
  })

  it('maps sets to four levels with half-open bounds', () => {
    expect([0, 0.5, 4.5, 5, 9.5, 10, 25].map(loadLevel)).toEqual([0, 1, 1, 2, 2, 3, 3])
  })

  it('ranks muscles by sets and keeps the fixed order on ties', () => {
    const squats = sessionWith('A', new Date(2026, 10, 16, 8, 0), { 0: 3 })
    const ranked = rankedMuscleLoad(weeklyMuscleSets([squats], monday))
    expect(ranked.slice(0, 4).map((r) => r.id)).toEqual(['glutes', 'quads', 'lower-back', 'adductors'])
  })

  it('formats half sets with a decimal comma', () => {
    expect(formatSetCount(1.5)).toBe('1,5')
    expect(formatSetCount(6)).toBe('6')
  })
})
