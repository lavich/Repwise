import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { sessionVolume } from '@/domain/session'
import type { ActiveWorkout } from '@/domain/types'
import { cn } from '@/lib/cn'
import { discardActive, finish } from '@/state/actions'
import { BottomActions } from './BottomActions'

const RPE_HINTS: Record<number, string> = {
  1: 'Очень легко',
  2: 'Легко',
  3: 'Легко',
  4: 'Комфортно',
  5: 'Комфортно',
  6: 'Умеренно, запас есть',
  7: 'Тяжело',
  8: 'Тяжело, запас 1–2 повтора',
  9: 'Очень тяжело',
  10: 'Предел',
}

const YES_NO = [
  { value: 'no' as const, label: 'Нет' },
  { value: 'yes' as const, label: 'Да' },
]


export function FeedbackView({ active, onFinished }: { active: ActiveWorkout; onFinished: (sessionId: string) => void }) {
  const [rpe, setRpe] = useState<number | null>(null)
  const { session } = active
  const nothingDone = session.exercises.every((e) => e.sets.length === 0)
  const stopping = active.stopping || nothingDone
  const askExplicitly = stopping || session.exercises.some((e) => e.skipped?.reason === 'pain')
  const [pain, setPain] = useState<'yes' | 'no' | null>(askExplicitly ? null : 'no')
  const [notes, setNotes] = useState('')
  const answered = rpe !== null && pain !== null
  const volume = sessionVolume(session)
  const sets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0)

  const save = () => {
    if (rpe === null || pain === null) return
    finish({ rpe, pain: pain === 'yes', notes })
    onFinished(session.id)
  }

  return (
    <>
      <div className="space-y-6 pb-6">
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">
            {stopping ? 'Тренировка остановлена' : 'Тренировка завершена'}
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            {sets} подх. · {volume} повт.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Насколько тяжело было в целом?</h2>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Оценка нагрузки RPE">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rpe === value}
                onClick={() => setRpe(value)}
                className={cn(
                  'tabular h-14 rounded-2xl text-xl font-bold transition-colors',
                  rpe === value ? 'bg-fg text-bg' : 'bg-surface-2 text-fg',
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="min-h-6 text-[15px] text-muted">
            {rpe === null ? 'RPE: 1 — очень легко, 10 — предел' : `RPE ${rpe}: ${RPE_HINTS[rpe]}`}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Была боль или дискомфорт?</h2>
          <Segmented value={pain} options={YES_NO} onChange={setPain} label="Боль или дискомфорт" />
        </section>

        {pain === 'yes' && (
          <p className="rounded-2xl bg-danger-soft p-4 text-[15px] leading-snug">
            Нагрузка не будет повышаться. Если боль повторяется от тренировки к тренировке, обратитесь к специалисту.
          </p>
        )}

        <label className="block space-y-2">
          <span className="text-lg font-semibold">Заметки</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Самочувствие, что было сложно…"
            className="w-full resize-none rounded-2xl border border-border bg-surface-2 px-4 py-3 text-base outline-none focus:border-accent"
          />
        </label>

        {stopping && (
          <button
            type="button"
            className="h-12 w-full text-[15px] font-semibold text-muted underline-offset-4 active:underline"
            onClick={() => {
              if (window.confirm('Удалить эту тренировку без сохранения?')) discardActive()
            }}
          >
            Выйти без сохранения
          </button>
        )}
      </div>

      <BottomActions>
        <Button size="lg" className="w-full" disabled={!answered} onClick={save}>
          Сохранить
        </Button>
      </BottomActions>
    </>
  )
}
