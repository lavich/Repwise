import { z } from 'zod'
import {
  BAND_LEVELS,
  EXERCISE_IDS,
  SKIP_REASONS,
  type ActiveWorkout,
  type AppData,
  type ExerciseProgression,
  type ProgressionSuggestion,
  type UserSettings,
  type WorkoutSession,
} from '@/domain/types'

const isoDate = z.iso.datetime({ message: 'Некорректная дата' })
const level = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
const band = z.enum(BAND_LEVELS)
const exerciseId = z.enum(EXERCISE_IDS)

const setResultSchema = z.object({
  setNumber: z.number().int().positive(),
  targetReps: z.number().int().nonnegative(),
  completedReps: z.number().int().nonnegative(),
  completedAt: isoDate,
})

const sessionExerciseSchema = z.object({
  plannedExerciseId: exerciseId,
  performedExerciseId: exerciseId,
  level,
  band: band.nullable(),
  targetSets: z.number().int().positive(),
  targetReps: z.number().int().positive(),
  sets: z.array(setResultSchema),
  goodTechnique: z.boolean().nullable(),
  skipped: z.object({ reason: z.enum(SKIP_REASONS), note: z.string().optional() }).optional(),
})

const feedbackSchema = z.object({
  rpe: z.number().int().min(1).max(10),
  pain: z.boolean(),
  dizzinessOrNausea: z.boolean(),
  notes: z.string(),
})

export const sessionSchema: z.ZodType<WorkoutSession> = z.object({
  id: z.string().min(1),
  workoutId: z.enum(['A', 'B']),
  programWeek: level,
  startedAt: isoDate,
  finishedAt: isoDate.optional(),
  status: z.enum(['in-progress', 'completed', 'stopped']),
  exercises: z.array(sessionExerciseSchema),
  feedback: feedbackSchema.optional(),
})

const exerciseProgressionSchema: z.ZodType<ExerciseProgression> = z.object({
  level,
  band: band.nullable(),
  useAlternative: z.boolean(),
  updatedAt: isoDate,
})

const progressionStateSchema = z.record(exerciseId, exerciseProgressionSchema)

const suggestionSchema: z.ZodType<ProgressionSuggestion> = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId,
  kind: z.enum(['progress', 'increase-band', 'repeat', 'reduce', 'safety-hold', 'use-alternative', 'on-plan']),
  reason: z.string(),
  current: exerciseProgressionSchema,
  proposed: exerciseProgressionSchema,
})

const settingsSchema: z.ZodType<UserSettings> = z.object({
  theme: z.enum(['dark', 'light']),
  restSeconds: z.number().int().min(15).max(300),
  safetyAcknowledged: z.boolean(),
})

const activeWorkoutSchema: z.ZodType<ActiveWorkout> = z.object({
  session: sessionSchema,
  exerciseIndex: z.number().int().nonnegative(),
  phase: z.enum(['intro', 'set', 'rest', 'technique', 'feedback']),
  restEndsAt: isoDate.nullable(),
  stopping: z.boolean(),
})

export const appDataSchema: z.ZodType<AppData> = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(sessionSchema),
  activeWorkout: activeWorkoutSchema.nullable(),
  progression: progressionStateSchema,
  pendingSuggestions: z.array(suggestionSchema),
  settings: settingsSchema,
})

export const backupSchema = z.object({
  app: z.literal('repwise'),
  exportedAt: isoDate,
  data: appDataSchema,
})

export type Backup = z.infer<typeof backupSchema>
