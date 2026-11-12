import { ArrowRight, Check } from 'lucide-react'
import { EXERCISES } from '@/domain/exercises'
import { prescriptionFor } from '@/domain/program'
import type { ExerciseProgression, ProgressionSuggestion } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { bandLabel, DECISION_LABELS, formatPrescription } from '@/lib/format'
import { confirmSuggestion, dismissSuggestion } from '@/state/actions'

function describe(suggestion: ProgressionSuggestion, state: ExerciseProgression): string {
  const exercise = EXERCISES[suggestion.exerciseId]
  const alt = exercise.alternativeId && state.useAlternative ? EXERCISES[exercise.alternativeId].nameRu : null
  const rx = prescriptionFor(suggestion.exerciseId, state.level)
  const parts = [alt ?? null, formatPrescription(rx.sets, rx.reps), exercise.equipment.kind === 'band' ? bandLabel(state.band) : null]
  return parts.filter(Boolean).join(' · ')
}

const TONES = {
  progress: 'accent',
  'increase-band': 'band',
  repeat: 'neutral',
  reduce: 'warning',
  'safety-hold': 'danger',
  'use-alternative': 'warning',
  'on-plan': 'neutral',
} as const

export function SuggestionCard({ suggestion }: { suggestion: ProgressionSuggestion }) {
  const exercise = EXERCISES[suggestion.exerciseId]
  return (
    <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{exercise.nameRu}</h3>
        <Badge tone={TONES[suggestion.kind]} className="shrink-0">
          {DECISION_LABELS[suggestion.kind]}
        </Badge>
      </div>
      <p className="mt-1 text-[15px] leading-snug text-muted">{suggestion.reason}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
        <span className="text-muted line-through decoration-1">{describe(suggestion, suggestion.current)}</span>
        <ArrowRight className="size-4 text-muted" />
        <span>{describe(suggestion, suggestion.proposed)}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={() => dismissSuggestion(suggestion.id)}>
          Оставить как есть
        </Button>
        <Button size="sm" onClick={() => confirmSuggestion(suggestion.id)}>
          <Check className="size-4" />
          Принять
        </Button>
      </div>
    </div>
  )
}
