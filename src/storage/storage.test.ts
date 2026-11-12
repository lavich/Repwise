import { describe, expect, it } from 'vitest'
import { recordSet } from '@/domain/session'
import { startWorkout } from '@/domain/workoutFlow'
import {
  createInitialData,
  isLegacyPayload,
  storageEventAction,
  LEGACY_V1_KEY,
  loadData,
  saveData,
  STORAGE_KEY,
  type KeyValueStorage,
} from './storage'

const NOW = '2026-11-12T10:00:00.000Z'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial))
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  }
}

const legacy = JSON.stringify({
  schemaVersion: 1,
  sessions: [{ id: 'old' }],
  activeWorkout: { session: { id: 'old-active' } },
  settings: { theme: 'light', restSeconds: 75, safetyAcknowledged: true },
})

describe('workout session persistence', () => {
  it('returns initial data with the new defaults when nothing is stored', () => {
    const data = loadData(memoryStorage(), NOW)
    expect(data).toEqual(createInitialData(NOW))
    expect(data.settings).toEqual({ theme: 'dark', restSeconds: 90, safetyAcknowledged: false })
  })

  it('restores an in-progress workout with recorded sets', () => {
    const storage = memoryStorage()
    const data = startWorkout(createInitialData(NOW), 's1', NOW)
    const active = data.activeWorkout!
    const withSet = { ...data, activeWorkout: { ...active, phase: 'rest' as const, session: recordSet(active.session, 0, 11, NOW) } }
    saveData(storage, withSet)
    expect(loadData(storage, NOW)).toEqual(withSet)
  })

  it('keeps unreadable data aside without overwriting an earlier copy', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'first' })
    expect(loadData(storage, NOW)).toEqual(createInitialData(NOW))
    storage.setItem(STORAGE_KEY, 'second')
    loadData(storage, '2026-11-13T10:00:00.000Z')
    expect(storage.items.get(`repwise:data:corrupted:${NOW}`)).toBe('first')
  })
})

describe('data of the previous program', () => {
  it('moves it aside and starts over, keeping only the theme', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: legacy })
    const data = loadData(storage, NOW)
    expect(storage.items.get(LEGACY_V1_KEY)).toBe(legacy)
    expect(data.sessions).toEqual([])
    expect(data.activeWorkout).toBeNull()
    expect(data.settings).toEqual({ theme: 'light', restSeconds: 90, safetyAcknowledged: false })
  })

  it('does not overwrite data already kept aside', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: legacy, [LEGACY_V1_KEY]: 'earlier' })
    loadData(storage, NOW)
    expect(storage.items.get(LEGACY_V1_KEY)).toBe('earlier')
  })

  it('recognises payloads written by an old tab', () => {
    expect(isLegacyPayload(legacy)).toBe(true)
    expect(isLegacyPayload(JSON.stringify(createInitialData(NOW)))).toBe(false)
    expect(isLegacyPayload(null)).toBe(false)
    expect(isLegacyPayload('{broken')).toBe(false)
  })

  it('writes the current data back when an old tab overwrites it', () => {
    expect(storageEventAction(STORAGE_KEY, legacy)).toBe('restore')
    expect(storageEventAction(STORAGE_KEY, JSON.stringify(createInitialData(NOW)))).toBe('reload')
    expect(storageEventAction('other', legacy)).toBe('ignore')
  })
})
