import { z } from 'zod'
import { findStep } from '@/domain/exercises'
import {
  DECISION_KINDS,
  EXERCISE_IDS,
  SCHEMA_VERSION,
  SKIP_REASONS,
  type ActiveWorkout,
  type AppData,
  type ExerciseId,
  type ExerciseProgression,
  type ProgressionSuggestion,
  type UserSettings,
  type WorkoutSession,
} from '@/domain/types'

const isoDate = z.iso.datetime({ message: 'Некорректная дата' })
const exerciseId = z.enum(EXERCISE_IDS)

function checkStep(ctx: z.RefinementCtx, id: ExerciseId, stepId: string, path: (string | number)[]) {
  if (!findStep(id, stepId)) ctx.addIssue({ code: 'custom', message: `Неизвестная ступень «${stepId}»`, path })
}

const setResultSchema = z.object({
  setNumber: z.number().int().positive(),
  repMin: z.number().int().positive(),
  repMax: z.number().int().positive(),
  completedReps: z.number().int().nonnegative(),
  completedAt: isoDate,
})

const sessionExerciseSchema = z
  .object({
    exerciseId,
    stepId: z.string(),
    repMin: z.number().int().positive(),
    repMax: z.number().int().positive(),
    perSide: z.boolean(),
    targetSets: z.number().int().positive(),
    sets: z.array(setResultSchema),
    goodTechnique: z.boolean().nullable(),
    skipped: z.object({ reason: z.enum(SKIP_REASONS), note: z.string().optional() }).optional(),
  })
  .superRefine((value, ctx) => checkStep(ctx, value.exerciseId, value.stepId, ['stepId']))

const feedbackSchema = z.object({
  rpe: z.number().int().min(1).max(10),
  pain: z.boolean(),
  notes: z.string(),
})

export const sessionSchema: z.ZodType<WorkoutSession> = z.object({
  id: z.string().min(1),
  workoutId: z.enum(['A', 'B']),
  startedAt: isoDate,
  finishedAt: isoDate.optional(),
  status: z.enum(['in-progress', 'completed', 'stopped']),
  exercises: z.array(sessionExerciseSchema),
  feedback: feedbackSchema.optional(),
})

const exerciseProgressionSchema = z.object({ stepId: z.string(), updatedAt: isoDate })

const progressionStateSchema = z
  .record(exerciseId, exerciseProgressionSchema)
  .superRefine((state, ctx) => {
    for (const [id, progression] of Object.entries(state) as [ExerciseId, ExerciseProgression][]) {
      checkStep(ctx, id, progression.stepId, [id, 'stepId'])
    }
  })

const suggestionSchema: z.ZodType<ProgressionSuggestion> = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    exerciseId,
    kind: z.enum(DECISION_KINDS),
    reason: z.string(),
    currentStepId: z.string(),
    proposedStepId: z.string(),
  })
  .superRefine((value, ctx) => {
    checkStep(ctx, value.exerciseId, value.currentStepId, ['currentStepId'])
    checkStep(ctx, value.exerciseId, value.proposedStepId, ['proposedStepId'])
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
  schemaVersion: z.literal(SCHEMA_VERSION),
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
