import { initialExerciseProgression } from '@/domain/program'
import { EXERCISE_IDS } from '@/domain/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Exercises added in later versions are missing from older data and backups;
// they start from the defaults instead of invalidating everything else.
export function fillMissingExercises(data: unknown, now: string): unknown {
  if (!isRecord(data) || !isRecord(data.progression)) return data
  const progression: Record<string, unknown> = { ...data.progression }
  for (const id of EXERCISE_IDS) progression[id] ??= initialExerciseProgression(id, now)
  return { ...data, progression }
}

export function schemaVersionOf(data: unknown): number | null {
  return isRecord(data) && typeof data.schemaVersion === 'number' ? data.schemaVersion : null
}

export function themeOf(data: unknown): 'dark' | 'light' | null {
  if (!isRecord(data) || !isRecord(data.settings)) return null
  const theme = data.settings.theme
  return theme === 'dark' || theme === 'light' ? theme : null
}
