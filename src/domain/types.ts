export const BAND_LEVELS = ['L1', 'L2', 'L3'] as const
export type BandLevel = (typeof BAND_LEVELS)[number]

export const EXERCISE_IDS = [
  'banded-squat',
  'glute-bridge',
  'lateral-band-walk',
  'standing-calf-raise',
  'dead-bug',
  'supported-reverse-lunge',
  'banded-clamshell',
  'standing-hip-abduction',
  'sit-to-stand',
  'heel-slides',
] as const
export type ExerciseId = (typeof EXERCISE_IDS)[number]

export type WorkoutId = 'A' | 'B'

export const PROGRAM_WEEKS = 4
export type Level = 1 | 2 | 3 | 4

export type BodyPosition = 'standing' | 'floor'

export type Equipment =
  | { kind: 'bodyweight' }
  | { kind: 'band'; band: BandLevel; placement: string }

export interface Exercise {
  id: ExerciseId
  nameRu: string
  nameEn: string
  equipment: Equipment
  equipmentNote: string
  position: BodyPosition
  summary: string
  startingPosition: string
  steps: string[]
  movement: string
  breathing: string
  commonMistakes: string[]
  safety: string[]
  alternativeId?: ExerciseId
  allowedBands: BandLevel[]
  restSeconds?: number
}

export interface Prescription {
  sets: number
  reps: number
}

export interface WorkoutExercise {
  exerciseId: ExerciseId
  weeks: readonly [Prescription, Prescription, Prescription, Prescription]
}

export interface Workout {
  id: WorkoutId
  title: string
  subtitle: string
  exercises: WorkoutExercise[]
}

export interface ExerciseSetResult {
  setNumber: number
  targetReps: number
  completedReps: number
  completedAt: string
}

export const SKIP_REASONS = ['pain', 'dizziness', 'balance', 'fatigue', 'other'] as const
export type SkipReason = (typeof SKIP_REASONS)[number]

export interface ExerciseSkip {
  reason: SkipReason
  note?: string
}

export interface SessionExercise {
  plannedExerciseId: ExerciseId
  performedExerciseId: ExerciseId
  level: Level
  band: BandLevel | null
  targetSets: number
  targetReps: number
  sets: ExerciseSetResult[]
  goodTechnique: boolean | null
  skipped?: ExerciseSkip
}

export interface SessionFeedback {
  rpe: number
  pain: boolean
  dizzinessOrNausea: boolean
  notes: string
}

export type SessionStatus = 'in-progress' | 'completed' | 'stopped'

export interface WorkoutSession {
  id: string
  workoutId: WorkoutId
  programWeek: Level
  startedAt: string
  finishedAt?: string
  status: SessionStatus
  exercises: SessionExercise[]
  feedback?: SessionFeedback
}

export interface ExerciseProgression {
  level: Level
  band: BandLevel | null
  useAlternative: boolean
  updatedAt: string
}

export type ProgressionState = Record<ExerciseId, ExerciseProgression>

export type ProgressionDecisionKind =
  | 'progress'
  | 'increase-band'
  | 'repeat'
  | 'reduce'
  | 'safety-hold'
  | 'use-alternative'
  | 'on-plan'

export interface ProgressionSuggestion {
  id: string
  sessionId: string
  exerciseId: ExerciseId
  kind: ProgressionDecisionKind
  reason: string
  current: ExerciseProgression
  proposed: ExerciseProgression
}

export type ThemePreference = 'dark' | 'light'

export interface UserSettings {
  theme: ThemePreference
  restSeconds: number
  safetyAcknowledged: boolean
}

export type WorkoutPhase = 'intro' | 'set' | 'rest' | 'technique' | 'feedback'

export interface ActiveWorkout {
  session: WorkoutSession
  exerciseIndex: number
  phase: WorkoutPhase
  restEndsAt: string | null
  stopping: boolean
}

export interface AppData {
  schemaVersion: 1
  sessions: WorkoutSession[]
  activeWorkout: ActiveWorkout | null
  progression: ProgressionState
  pendingSuggestions: ProgressionSuggestion[]
  settings: UserSettings
}
