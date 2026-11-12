import { ArrowRight, Check } from 'lucide-react'
import { EXERCISES, stepLabel } from '@/domain/exercises'
import type { ProgressionSuggestion } from '@/domain/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DECISION_LABELS } from '@/lib/format'
import { confirmSuggestion, dismissSuggestion } from '@/state/actions'

const TONES = {
  'step-up': 'accent',
  'step-down': 'warning',
  'pain-hold': 'danger',
  keep: 'neutral',
  'add-reps': 'neutral',
  'top-step': 'neutral',
  'bottom-step': 'neutral',
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
        <span className="text-muted line-through decoration-1">{stepLabel(suggestion.exerciseId, suggestion.currentStepId)}</span>
        <ArrowRight className="size-4 text-muted" />
        <span>{stepLabel(suggestion.exerciseId, suggestion.proposedStepId)}</span>
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
