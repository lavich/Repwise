import { applySuggestion, setStepManually } from '@/domain/progression'
import type { ActiveWorkout, AppData, ExerciseId, SessionFeedback, UserSettings, WorkoutId } from '@/domain/types'
import { finishWorkout, pendingActionableSuggestions, startWorkout } from '@/domain/workoutFlow'
import { createInitialData } from '@/storage/storage'
import { newId, nowIso, updateData } from './store'

export function start(workoutId?: WorkoutId) {
  updateData((data) => startWorkout(data, newId(), nowIso(), workoutId))
}

export function updateActive(update: (active: ActiveWorkout) => ActiveWorkout) {
  updateData((data) => (data.activeWorkout ? { ...data, activeWorkout: update(data.activeWorkout) } : data))
}

export function finish(feedback: SessionFeedback) {
  updateData((data) => finishWorkout(data, feedback, nowIso()))
}

export function discardActive() {
  updateData((data) => ({ ...data, activeWorkout: null }))
}

export function confirmSuggestion(id: string) {
  updateData((data) => {
    const suggestion = pendingActionableSuggestions(data).find((s) => s.id === id)
    if (!suggestion) return data
    return {
      ...data,
      progression: applySuggestion(data.progression, suggestion, nowIso()),
      pendingSuggestions: data.pendingSuggestions.filter((s) => s.id !== id),
    }
  })
}

export function dismissSuggestion(id: string) {
  updateData((data) => ({ ...data, pendingSuggestions: data.pendingSuggestions.filter((s) => s.id !== id) }))
}

export function changeStep(exerciseId: ExerciseId, stepId: string) {
  updateData((data) => ({
    ...data,
    progression: setStepManually(data.progression, exerciseId, stepId, nowIso()),
    pendingSuggestions: data.pendingSuggestions.filter((s) => s.exerciseId !== exerciseId),
  }))
}

export function updateSettings(change: Partial<UserSettings>) {
  updateData((data) => ({ ...data, settings: { ...data.settings, ...change } }))
}

export function replaceData(next: AppData) {
  updateData(() => next)
}

export function resetAll() {
  updateData((data) => ({ ...createInitialData(nowIso()), settings: data.settings }))
}
