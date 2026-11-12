import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChoiceRow } from '@/components/ui/choice'
import { Sheet } from '@/components/ui/sheet'
import { EXERCISES } from '@/domain/exercises'
import { SKIP_REASONS, type SessionExercise, type SkipReason } from '@/domain/types'
import { skipCurrentExercise } from '@/domain/workoutFlow'
import { SKIP_REASON_LABELS } from '@/lib/format'
import { updateActive } from '@/state/actions'

export function SkipSheet({
  open,
  exercise,
  onClose,
  onStopWorkout,
}: {
  open: boolean
  exercise: SessionExercise
  onClose: () => void
  onStopWorkout: () => void
}) {
  const [reason, setReason] = useState<SkipReason | null>(null)
  const [note, setNote] = useState('')
  const info = EXERCISES[exercise.exerciseId]
  const painful = reason === 'pain'

  const close = () => {
    setReason(null)
    setNote('')
    onClose()
  }

  const skip = () => {
    if (!reason) return
    updateActive((active) => skipCurrentExercise(active, { reason, note }))
    close()
  }

  return (
    <Sheet open={open} onClose={close} title="Пропустить упражнение">
      <p className="mb-4 text-[15px] text-muted">«{info.nameRu}» — укажите причину, она поможет скорректировать программу.</p>
      <div className="space-y-2" role="radiogroup" aria-label="Причина пропуска">
        {SKIP_REASONS.map((r) => (
          <ChoiceRow key={r} selected={reason === r} onClick={() => setReason(r)}>
            {SKIP_REASON_LABELS[r]}
          </ChoiceRow>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">Комментарий</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Необязательно"
          className="mt-2 w-full resize-none rounded-2xl border border-border bg-surface-2 px-4 py-3 text-base outline-none focus:border-accent"
        />
      </label>
      {painful && (
        <div className="mt-4 rounded-2xl bg-danger-soft p-4">
          <p className="text-[15px] leading-snug">
            Если боль не проходит за пару минут — лучше закончить тренировку на сегодня.
          </p>
          <Button variant="danger" className="mt-3 w-full" onClick={() => { close(); onStopWorkout() }}>
            Остановить тренировку
          </Button>
        </div>
      )}
      <Button size="lg" className="mt-4 w-full" disabled={!reason} onClick={skip}>
        Пропустить упражнение
      </Button>
    </Sheet>
  )
}
