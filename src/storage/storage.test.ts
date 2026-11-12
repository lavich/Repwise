import { describe, expect, it } from 'vitest'
import { startWorkout } from '@/domain/workoutFlow'
import { recordSet } from '@/domain/session'
import { createInitialData, loadData, saveData, STORAGE_KEY, type KeyValueStorage } from './storage'

const NOW = '2026-11-12T10:00:00.000Z'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial))
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  }
}

describe('workout session persistence', () => {
  it('returns initial data when nothing is stored', () => {
    expect(loadData(memoryStorage(), NOW)).toEqual(createInitialData(NOW))
  })

  it('restores an in-progress workout with recorded sets', () => {
    const storage = memoryStorage()
    const data = startWorkout(createInitialData(NOW), 's1', NOW)
    const active = data.activeWorkout!
    const withSet = { ...data, activeWorkout: { ...active, phase: 'rest' as const, session: recordSet(active.session, 0, 11, NOW) } }
    saveData(storage, withSet)
    const restored = loadData(storage, NOW)
    expect(restored).toEqual(withSet)
    expect(restored.activeWorkout?.session.exercises[0]?.sets[0]?.completedReps).toBe(11)
  })

  it('keeps unreadable data aside instead of overwriting it silently', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{"broken"' })
    expect(loadData(storage, NOW)).toEqual(createInitialData(NOW))
    expect(storage.items.get(`repwise:data:corrupted:${NOW}`)).toBe('{"broken"')
  })

  it('does not overwrite an earlier corrupted copy', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'first' })
    loadData(storage, NOW)
    storage.setItem(STORAGE_KEY, 'second')
    loadData(storage, '2026-11-13T10:00:00.000Z')
    expect(storage.items.get(`repwise:data:corrupted:${NOW}`)).toBe('first')
  })
})
