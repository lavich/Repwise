import { ChevronRight, History, Play } from 'lucide-react'
import { useState } from 'react'
import { ScopeNotice, SafetyRules } from '@/components/SafetyNotice'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SuggestionCard } from '@/components/SuggestionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, SectionTitle } from '@/components/ui/card'
import { Sheet } from '@/components/ui/sheet'
import { EXERCISES } from '@/domain/exercises'
import {
  completedSessions,
  isProgramFinished,
  nextWorkoutId,
  prescriptionFor,
  PROGRAM_TOTAL_WORKOUTS,
  programWeekAfter,
  WORKOUTS,
  WORKOUTS_PER_WEEK,
} from '@/domain/program'
import { PROGRAM_WEEKS, type WorkoutId } from '@/domain/types'
import { pendingActionableSuggestions } from '@/domain/workoutFlow'
import { cn } from '@/lib/cn'
import { formatPrescription, formatWeekday, plural } from '@/lib/format'
import { start, updateSettings } from '@/state/actions'
import { useAppData } from '@/state/store'

export function DashboardScreen({ onOpenHistory }: { onOpenHistory: () => void }) {
  const data = useAppData()
  const done = completedSessions(data.sessions)
  const week = programWeekAfter(done.length)
  const finished = isProgramFinished(done.length)
  const suggested = nextWorkoutId(data.sessions)
  const [chosen, setChosen] = useState<WorkoutId | null>(null)
  const workoutId = chosen ?? suggested
  const workout = WORKOUTS[workoutId]
  const [safetyOpen, setSafetyOpen] = useState(false)
  const suggestions = pendingActionableSuggestions(data)
  const last = data.sessions.at(-1)

  const begin = () => {
    if (!data.settings.safetyAcknowledged) setSafetyOpen(true)
    else start(workoutId)
  }

  return (
    <>
      <ScreenHeader
        subtitle={finished ? 'Программа пройдена' : `Неделя ${week} из ${PROGRAM_WEEKS}`}
        title="Repwise"
      />

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-medium text-muted">Следующая тренировка</p>
          <div className="flex gap-1 rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Выбор тренировки">
            {(['A', 'B'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={id === workoutId}
                aria-label={WORKOUTS[id].title}
                onClick={() => setChosen(id === suggested ? null : id)}
                className={cn(
                  'size-11 rounded-full text-[15px] font-bold',
                  id === workoutId ? 'bg-fg text-bg' : 'text-muted',
                )}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{workout.title}</h2>
        <p className="text-[15px] text-muted">{workout.subtitle}</p>

        <ol className="mt-4 divide-y divide-border">
          {workout.exercises.map(({ exerciseId }) => {
            const state = data.progression[exerciseId]
            const alternativeId = EXERCISES[exerciseId].alternativeId
            const performed = state.useAlternative && alternativeId ? alternativeId : exerciseId
            const rx = prescriptionFor(exerciseId, state.level)
            return (
              <li key={exerciseId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-[15px] font-medium">{EXERCISES[performed].nameRu}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {state.band && <Badge tone="band">{state.band}</Badge>}
                  <span className="tabular text-[15px] font-semibold">{formatPrescription(rx.sets, rx.reps)}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <Button size="lg" className="mt-4 w-full" onClick={begin}>
          <Play className="size-5 fill-current" />
          Начать тренировку
        </Button>
        {chosen && (
          <p className="mt-2 text-center text-[13px] text-muted">
            По расписанию сейчас {WORKOUTS[suggested].title.toLowerCase()}
          </p>
        )}
      </Card>

      {suggestions.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Рекомендации по нагрузке</SectionTitle>
          <Card className="space-y-3 p-3">
            <p className="px-1 text-[15px] text-muted">Нагрузка меняется только после вашего подтверждения.</p>
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </Card>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>Программа</SectionTitle>
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-medium">4 недели · 2 тренировки в неделю</p>
            <p className="tabular text-[15px] font-semibold">
              {Math.min(done.length, PROGRAM_TOTAL_WORKOUTS)}/{PROGRAM_TOTAL_WORKOUTS}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2" aria-hidden="true">
            {Array.from({ length: PROGRAM_WEEKS }, (_, w) => (
              <div key={w} className="space-y-1.5">
                <div className="flex gap-1">
                  {Array.from({ length: WORKOUTS_PER_WEEK }, (_, i) => {
                    const index = w * WORKOUTS_PER_WEEK + i
                    return (
                      <div
                        key={i}
                        className={cn(
                          'h-2 flex-1 rounded-full',
                          index < done.length ? 'bg-accent' : index === done.length ? 'bg-accent/30' : 'bg-surface-2',
                        )}
                      />
                    )
                  })}
                </div>
                <p className={cn('text-xs font-semibold', w + 1 === week && !finished ? 'text-fg' : 'text-muted')}>
                  Неделя {w + 1}
                </p>
              </div>
            ))}
          </div>
          {finished && (
            <p className="mt-3 text-[15px] text-muted">
              Все 8 тренировок выполнены. Можно продолжать на уровне 4-й недели и менять нагрузку по рекомендациям.
            </p>
          )}
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <Card>
          <p className="tabular text-3xl font-bold">{done.length}</p>
          <p className="text-[13px] font-medium text-muted">
            {plural(done.length, 'тренировка выполнена', 'тренировки выполнено', 'тренировок выполнено')}
          </p>
        </Card>
        <Card>
          <p className="text-lg leading-9 font-bold">{last ? formatWeekday(last.startedAt) : '—'}</p>
          <p className="text-[13px] font-medium text-muted">последняя тренировка</p>
        </Card>
      </section>

      <button
        type="button"
        onClick={onOpenHistory}
        className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-3xl border border-border bg-surface px-4 text-left"
      >
        <History className="size-5 text-muted" />
        <span className="flex-1 font-semibold">История тренировок</span>
        <ChevronRight className="size-5 text-muted" />
      </button>

      <ScopeNotice className="mt-6" />

      <Sheet open={safetyOpen} onClose={() => setSafetyOpen(false)} title="Перед первой тренировкой">
        <SafetyRules />
        <p className="mt-4 text-[15px] text-muted">
          Кнопка «Стоп» доступна на каждом шаге. Любое упражнение можно пропустить и указать причину.
        </p>
        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={() => {
            updateSettings({ safetyAcknowledged: true })
            setSafetyOpen(false)
            start(workoutId)
          }}
        >
          Понятно, начать
        </Button>
      </Sheet>
    </>
  )
}
