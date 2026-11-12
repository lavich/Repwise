import { initialProgressionState } from '@/domain/program'
import { SCHEMA_VERSION, type AppData, type UserSettings } from '@/domain/types'
import { fillMissingExercises, schemaVersionOf, themeOf } from './migrate'
import { appDataSchema } from './schema'

export const STORAGE_KEY = 'repwise:data'
const CORRUPTED_KEY_PREFIX = 'repwise:data:corrupted:'
export const LEGACY_V1_KEY = 'repwise:data:v1'

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  restSeconds: 90,
  safetyAcknowledged: false,
}

export function createInitialData(now: string): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
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
    const json: unknown = JSON.parse(raw)
    if (schemaVersionOf(json) === 1) return startFromLegacy(storage, raw, json, now)
    const parsed = appDataSchema.safeParse(fillMissingExercises(json, now))
    if (parsed.success) return parsed.data
  } catch {
    // Falls through to preserving the unreadable payload below.
  }
  storage.setItem(`${CORRUPTED_KEY_PREFIX}${now}`, raw)
  return createInitialData(now)
}

// The previous program is not migrated: its data is kept aside untouched and
// the app starts over, keeping only the theme.
function startFromLegacy(storage: KeyValueStorage, raw: string, json: unknown, now: string): AppData {
  if (storage.getItem(LEGACY_V1_KEY) === null) storage.setItem(LEGACY_V1_KEY, raw)
  const initial = createInitialData(now)
  const theme = themeOf(json)
  return theme ? { ...initial, settings: { ...initial.settings, theme } } : initial
}

export type StorageEventAction = 'ignore' | 'reload' | 'restore'

// A tab still running the previous version writes old-format data over the
// current one; the current data has to be written back, otherwise the next
// load would treat the stored value as the previous program and start over.
export function storageEventAction(key: string | null, newValue: string | null): StorageEventAction {
  if (key !== STORAGE_KEY) return 'ignore'
  return isLegacyPayload(newValue) ? 'restore' : 'reload'
}

export function isLegacyPayload(raw: string | null): boolean {
  if (raw === null) return false
  try {
    return schemaVersionOf(JSON.parse(raw)) === 1
  } catch {
    return false
  }
}

export function saveData(storage: KeyValueStorage, data: AppData): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data))
}
