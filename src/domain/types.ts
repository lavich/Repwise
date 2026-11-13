export const BAND_LEVELS = ['L1', 'L2', 'L3'] as const
export type BandLevel = (typeof BAND_LEVELS)[number]

export const EXERCISE_IDS = [
  'band-squat',
  'push-up',
  'seated-band-row',
  'band-romanian-deadlift',
  'band-overhead-press',
  'band-biceps-curl',
  'calf-raise',
  'reverse-crunch',
  'bulgarian-split-squat',
  'bent-over-band-row',
  'sliding-leg-curl',
  'band-lateral-raise',
  'banded-glute-bridge',
  'band-overhead-triceps-extension',
  'dead-bug',
] as const
export type ExerciseId = (typeof EXERCISE_IDS)[number]

export type WorkoutId = 'A' | 'B'

export const MUSCLE_IDS = [
  'chest',
  'front-delts',
  'side-delts',
  'biceps',
  'triceps',
  'abs',
  'obliques',
  'lats',
  'upper-back',
  'lower-back',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
] as const
export type MuscleId = (typeof MUSCLE_IDS)[number]

export interface ExerciseMuscles {
  primary: MuscleId[]
  secondary: MuscleId[]
}

export interface LoadStep {
  id: string
  label: string
  bands: BandLevel[]
}

export interface RepRange {
  min: number
  max: number
}

export interface Exercise {
  id: ExerciseId
  nameRu: string
  nameEn: string
  muscles: ExerciseMuscles
  summary: string
  repRange: RepRange
  perSide: boolean
  sets: number
  restSeconds?: number
  loadSteps: LoadStep[]
  defaultStepId: string
  startingPosition: string
  steps: string[]
  movement: string
  breathing: string
  commonMistakes: string[]
  tips: string[]
}

export interface Workout {
  id: WorkoutId
  title: string
  subtitle: string
  exerciseIds: ExerciseId[]
}

export interface ExerciseSetResult {
  setNumber: number
  repMin: number
  repMax: number
  completedReps: number
  completedAt: string
}

export const SKIP_REASONS = ['pain', 'fatigue', 'equipment', 'other'] as const
export type SkipReason = (typeof SKIP_REASONS)[number]

export interface ExerciseSkip {
  reason: SkipReason
  note?: string
}

export interface SessionExercise {
  exerciseId: ExerciseId
  stepId: string
  repMin: number
  repMax: number
  perSide: boolean
  targetSets: number
  sets: ExerciseSetResult[]
  goodTechnique: boolean | null
  skipped?: ExerciseSkip
}

export interface SessionFeedback {
  rpe: number
  pain: boolean
  notes: string
}

export type SessionStatus = 'in-progress' | 'completed' | 'stopped'

export interface WorkoutSession {
  id: string
  workoutId: WorkoutId
  startedAt: string
  finishedAt?: string
  status: SessionStatus
  exercises: SessionExercise[]
  feedback?: SessionFeedback
}

export interface ExerciseProgression {
  stepId: string
  updatedAt: string
}

export type ProgressionState = Record<ExerciseId, ExerciseProgression>

export const DECISION_KINDS = [
  'step-up',
  'step-down',
  'pain-hold',
  'keep',
  'add-reps',
  'top-step',
  'bottom-step',
] as const
export type ProgressionDecisionKind = (typeof DECISION_KINDS)[number]

export interface ProgressionSuggestion {
  id: string
  sessionId: string
  exerciseId: ExerciseId
  kind: ProgressionDecisionKind
  reason: string
  currentStepId: string
  proposedStepId: string
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

export const SCHEMA_VERSION = 2

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION
  sessions: WorkoutSession[]
  activeWorkout: ActiveWorkout | null
  progression: ProgressionState
  pendingSuggestions: ProgressionSuggestion[]
  settings: UserSettings
}
