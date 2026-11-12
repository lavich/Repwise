import type { AppData } from '@/domain/types'
import { localDayKey } from '@/domain/stats'
import { fillMissingExercises, schemaVersionOf } from './migrate'
import { backupSchema, type Backup } from './schema'

export function createBackup(data: AppData, now: string): Backup {
  return { app: 'repwise', exportedAt: now, data: { ...data, activeWorkout: null } }
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2)
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string }

export function parseBackup(text: string, now: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Файл не является корректным JSON.' }
  }
  const data = typeof json === 'object' && json !== null && 'data' in json ? json.data : undefined
  if (schemaVersionOf(data) === 1) {
    return { ok: false, error: 'Это резервная копия прежней программы — в новой программе её не открыть.' }
  }
  const parsed = backupSchema.safeParse(
    typeof json === 'object' && json !== null && 'data' in json ? { ...json, data: fillMissingExercises(json.data, now) } : json,
  )
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.') || 'корень'
    return { ok: false, error: `Файл не похож на резервную копию Repwise (${path}: ${issue?.message ?? 'ошибка'}).` }
  }
  return { ok: true, data: { ...parsed.data.data, activeWorkout: null } }
}

export function backupFileName(now: Date): string {
  return `repwise-backup-${localDayKey(now)}.json`
}
