import { sessionVolume } from './session'
import type { BandLevel, ExerciseId, ExerciseSkip, SessionStatus, WorkoutSession } from './types'

export function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function finishedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((s) => s.status !== 'in-progress')
    .toSorted((a, b) => a.startedAt.localeCompare(b.startedAt))
}

export function sessionDays(sessions: readonly WorkoutSession[]): Map<string, SessionStatus> {
  const days = new Map<string, SessionStatus>()
  for (const s of finishedSessions(sessions)) {
    const key = localDayKey(new Date(s.startedAt))
    if (days.get(key) !== 'completed') days.set(key, s.status)
  }
  return days
}

export interface SeriesPoint {
  date: string
  value: number
}

export function rpeSeries(sessions: readonly WorkoutSession[]): SeriesPoint[] {
  return finishedSessions(sessions).flatMap((s) => (s.feedback ? [{ date: s.startedAt, value: s.feedback.rpe }] : []))
}

export function volumeSeries(sessions: readonly WorkoutSession[]): SeriesPoint[] {
  return finishedSessions(sessions).map((s) => ({ date: s.startedAt, value: sessionVolume(s) }))
}

export interface ExerciseHistoryEntry {
  sessionId: string
  date: string
  performedExerciseId: ExerciseId
  band: BandLevel | null
  targetSets: number
  targetReps: number
  reps: number[]
  totalReps: number
  skipped?: ExerciseSkip
}

export function exerciseHistory(sessions: readonly WorkoutSession[], exerciseId: ExerciseId): ExerciseHistoryEntry[] {
  return finishedSessions(sessions).flatMap((s) =>
    s.exercises
      .filter((e) => e.plannedExerciseId === exerciseId && (e.sets.length > 0 || e.skipped))
      .map((e) => ({
        sessionId: s.id,
        date: s.startedAt,
        performedExerciseId: e.performedExerciseId,
        band: e.band,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        reps: e.sets.map((set) => set.completedReps),
        totalReps: e.sets.reduce((sum, set) => sum + set.completedReps, 0),
        skipped: e.skipped,
      })),
  )
}
