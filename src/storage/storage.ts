import { initialProgressionState } from '@/domain/program'
import type { AppData, UserSettings } from '@/domain/types'
import { fillMissingExercises } from './migrate'
import { appDataSchema } from './schema'

export const STORAGE_KEY = 'repwise:data'
const CORRUPTED_KEY_PREFIX = 'repwise:data:corrupted:'

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  restSeconds: 75,
  safetyAcknowledged: false,
}

export function createInitialData(now: string): AppData {
  return {
    schemaVersion: 1,
    sessions: [],
    activeWorkout: null,
    progression: initialProgressionState(now),
    pendingSuggestions: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

export function loadData(storage: KeyValueStorage, now: string): AppData {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return createInitialData(now)
  try {
    const parsed = appDataSchema.safeParse(fillMissingExercises(JSON.parse(raw), now))
    if (parsed.success) return parsed.data
  } catch {
    // Falls through to preserving the unreadable payload below.
  }
  storage.setItem(`${CORRUPTED_KEY_PREFIX}${now}`, raw)
  return createInitialData(now)
}

export function saveData(storage: KeyValueStorage, data: AppData): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data))
}
