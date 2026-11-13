import { EXERCISES } from './exercises'
import { startOfWeek } from './program'
import { sessionVolume } from './session'
import { MUSCLE_IDS, type ExerciseId, type ExerciseSkip, type MuscleId, type SessionStatus, type WorkoutSession } from './types'

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
  stepId: string
  targetSets: number
  repMin: number
  repMax: number
  reps: number[]
  totalReps: number
  skipped?: ExerciseSkip
}

export function exerciseHistory(sessions: readonly WorkoutSession[], exerciseId: ExerciseId): ExerciseHistoryEntry[] {
  return finishedSessions(sessions).flatMap((s) =>
    s.exercises
      .filter((e) => e.exerciseId === exerciseId && (e.sets.length > 0 || e.skipped))
      .map((e) => ({
        sessionId: s.id,
        date: s.startedAt,
        stepId: e.stepId,
        targetSets: e.targetSets,
        repMin: e.repMin,
        repMax: e.repMax,
        reps: e.sets.map((set) => set.completedReps),
        totalReps: e.sets.reduce((sum, set) => sum + set.completedReps, 0),
        skipped: e.skipped,
      })),
  )
}

export type MuscleLoad = Record<MuscleId, number>
export type LoadLevel = 0 | 1 | 2 | 3

export function weeklyMuscleSets(sessions: readonly WorkoutSession[], now: Date): MuscleLoad {
  const load = Object.fromEntries(MUSCLE_IDS.map((id) => [id, 0])) as MuscleLoad
  const from = startOfWeek(now)
  const to = new Date(from)
  to.setDate(to.getDate() + 7)
  for (const session of finishedSessions(sessions)) {
    const started = Date.parse(session.startedAt)
    if (started < from.getTime() || started >= to.getTime()) continue
    for (const exercise of session.exercises) {
      const sets = exercise.sets.length
      if (sets === 0) continue
      const { primary, secondary } = EXERCISES[exercise.exerciseId].muscles
      for (const id of primary) load[id] += sets
      for (const id of secondary) load[id] += sets / 2
    }
  }
  return load
}

export function loadLevel(sets: number): LoadLevel {
  if (sets <= 0) return 0
  if (sets < 5) return 1
  if (sets < 10) return 2
  return 3
}

export function rankedMuscleLoad(load: MuscleLoad): { id: MuscleId; sets: number }[] {
  return MUSCLE_IDS.map((id) => ({ id, sets: load[id] })).sort((a, b) => b.sets - a.sets)
}
