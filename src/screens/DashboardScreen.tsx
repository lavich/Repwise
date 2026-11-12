import { ChevronRight, History, Play } from 'lucide-react'
import { useState } from 'react'
import { SafetyRules } from '@/components/SafetyNotice'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SuggestionCard } from '@/components/SuggestionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, SectionTitle } from '@/components/ui/card'
import { Sheet } from '@/components/ui/sheet'
import { EXERCISES, stepLabel } from '@/domain/exercises'
import { completedSessions, completedThisWeek, nextWorkoutId, WEEKLY_GOAL, WORKOUTS } from '@/domain/program'
import type { WorkoutId } from '@/domain/types'
import { pendingActionableSuggestions } from '@/domain/workoutFlow'
import { cn } from '@/lib/cn'
import { formatRepRange, formatWeekday, plural } from '@/lib/format'
import { start, updateSettings } from '@/state/actions'
import { useAppData } from '@/state/store'

export function DashboardScreen({ onOpenHistory }: { onOpenHistory: () => void }) {
  const data = useAppData()
  const done = completedSessions(data.sessions)
  const [now] = useState(() => new Date())
  const thisWeek = completedThisWeek(data.sessions, now)
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
      <ScreenHeader subtitle={`На этой неделе ${thisWeek} из ${WEEKLY_GOAL}`} title="Repwise" />

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
          {workout.exerciseIds.map((exerciseId) => {
            const exercise = EXERCISES[exerciseId]
            const stepId = data.progression[exerciseId].stepId
            return (
              <li key={exerciseId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{exercise.nameRu}</span>
                  <span className="tabular block text-[13px] text-muted">
                    {exercise.sets} × {formatRepRange(exercise.repRange.min, exercise.repRange.max, exercise.perSide)}
                  </span>
                </span>
                <Badge tone="band" className="max-w-[45%] shrink-0">
                  <span className="truncate">{stepLabel(exerciseId, stepId)}</span>
                </Badge>
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
        <SectionTitle>Неделя</SectionTitle>
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-medium">Цель — {WEEKLY_GOAL} тренировки на всё тело</p>
            <p className="tabular text-[15px] font-semibold">
              {Math.min(thisWeek, WEEKLY_GOAL)}/{WEEKLY_GOAL}
            </p>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: WEEKLY_GOAL }, (_, i) => (
              <div key={i} className={cn('h-2 flex-1 rounded-full', i < thisWeek ? 'bg-accent' : 'bg-surface-2')} />
            ))}
          </div>
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
