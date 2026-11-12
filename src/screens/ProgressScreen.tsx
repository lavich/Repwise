import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { MonthCalendar } from '@/components/charts/MonthCalendar'
import { TrendChart } from '@/components/charts/TrendChart'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Badge } from '@/components/ui/badge'
import { Card, SectionTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { EXERCISES, stepLabel } from '@/domain/exercises'
import { WORKOUTS } from '@/domain/program'
import { sessionVolume } from '@/domain/session'
import { exerciseHistory, finishedSessions, rpeSeries, sessionDays, volumeSeries } from '@/domain/stats'
import { EXERCISE_IDS, type ExerciseId, type WorkoutSession } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatDay, formatDuration, formatRepRange, formatShortDay, formatTime, formatWeekday, SKIP_REASON_LABELS } from '@/lib/format'
import { useAppData } from '@/state/store'

type View = 'overview' | 'history'

export function ProgressScreen({ view, onViewChange }: { view: View; onViewChange: (view: View) => void }) {
  return (
    <>
      <ScreenHeader title="Прогресс" />
      <Segmented
        value={view}
        onChange={onViewChange}
        label="Раздел"
        options={[
          { value: 'overview', label: 'Обзор' },
          { value: 'history', label: 'История' },
        ]}
        className="mb-6"
      />
      {view === 'overview' ? <Overview /> : <HistoryList />}
    </>
  )
}

function Overview() {
  const { sessions } = useAppData()
  const [exerciseId, setExerciseId] = useState<ExerciseId>('band-squat')
  const history = exerciseHistory(sessions, exerciseId)
  const performed = history.filter((h) => !h.skipped)

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Календарь</SectionTitle>
        <Card>
          <MonthCalendar days={sessionDays(sessions)} />
        </Card>
      </section>

      <section>
        <SectionTitle>Нагрузка (RPE)</SectionTitle>
        <Card>
          <TrendChart
            points={rpeSeries(sessions)}
            kind="line"
            label="RPE по тренировкам"
            unit="RPE"
            yMax={10}
          />
          <p className="mt-2 text-[13px] text-muted">Для роста мышц подходы близко к отказу — RPE 8–9 это норма.</p>
        </Card>
      </section>

      <section>
        <SectionTitle>Повторы за тренировку</SectionTitle>
        <Card>
          <TrendChart points={volumeSeries(sessions)} kind="bar" label="Сумма повторов за тренировку" unit="повт." />
        </Card>
      </section>

      <section>
        <SectionTitle>По упражнениям</SectionTitle>
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {EXERCISE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setExerciseId(id)}
              aria-pressed={id === exerciseId}
              className={cn(
                'h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap',
                id === exerciseId ? 'bg-fg text-bg' : 'bg-surface text-muted',
              )}
            >
              {EXERCISES[id].nameRu}
            </button>
          ))}
        </div>
        <Card className="space-y-4">
          <TrendChart
            key={exerciseId}
            points={performed.map((h) => ({ date: h.date, value: h.totalReps }))}
            kind="bar"
            label={`Повторы: ${EXERCISES[exerciseId].nameRu}`}
            unit="повт."
          />
          {performed.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Ступень</p>
              <div className="flex flex-wrap gap-1.5">
                {performed.map((h) => (
                  <Badge key={h.sessionId} tone="band" className="tabular">
                    {formatShortDay(h.date)} · {stepLabel(exerciseId, h.stepId)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Предыдущие результаты</p>
              <ul className="divide-y divide-border">
                {history
                  .toReversed()
                  .slice(0, 8)
                  .map((h) => (
                    <li key={h.sessionId} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                      <span className="text-muted">{formatShortDay(h.date)}</span>
                      {h.skipped ? (
                        <span className="text-right text-muted">Пропуск: {SKIP_REASON_LABELS[h.skipped.reason].toLowerCase()}</span>
                      ) : (
                        <span className="tabular text-right font-semibold">
                          {h.reps.join(' · ')}
                          <span className="font-normal text-muted">
                            {' '}
                            / {formatRepRange(h.repMin, h.repMax)} · {stepLabel(exerciseId, h.stepId)}
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}

function HistoryList() {
  const { sessions } = useAppData()
  const [selected, setSelected] = useState<WorkoutSession | null>(null)
  const list = finishedSessions(sessions).toReversed()

  if (list.length === 0) {
    return (
      <Card className="py-10 text-center">
        <p className="font-semibold">Пока нет тренировок</p>
        <p className="mt-1 text-[15px] text-muted">Завершённые тренировки появятся здесь.</p>
      </Card>
    )
  }

  return (
    <>
      <Card className="divide-y divide-border p-0">
        {list.map((s) => {
          const pain = s.feedback?.pain === true
          return (
            <button key={s.id} type="button" onClick={() => setSelected(s)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{formatWeekday(s.startedAt)}</span>
                <span className="block text-[13px] text-muted">
                  {WORKOUTS[s.workoutId].title} · {sessionVolume(s)} повт.
                </span>
              </span>
              {pain && <AlertTriangle className="size-4 text-warning" aria-label="Была боль" />}
              {s.status === 'stopped' && <Badge tone="warning">Стоп</Badge>}
              {s.feedback && <Badge>RPE {s.feedback.rpe}</Badge>}
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </button>
          )
        })}
      </Card>
      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected ? WORKOUTS[selected.workoutId].title : ''}>
        {selected && <SessionDetails session={selected} />}
      </Sheet>
    </>
  )
}

function SessionDetails({ session }: { session: WorkoutSession }) {
  const fb = session.feedback
  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted">
        {formatDay(session.startedAt)}, {formatTime(session.startedAt)} · {formatDuration(session.startedAt, session.finishedAt)}
        {session.status === 'stopped' && ' · остановлена'}
      </p>
      {fb && (
        <div className="flex flex-wrap gap-2">
          <Badge>RPE {fb.rpe}</Badge>
          <Badge tone={fb.pain ? 'danger' : 'neutral'}>{fb.pain ? 'Была боль' : 'Без боли'}</Badge>
        </div>
      )}
      {fb?.notes && <p className="rounded-2xl bg-surface-2 p-4 text-[15px] leading-snug">{fb.notes}</p>}
      <ul className="divide-y divide-border">
        {session.exercises.map((e) => (
          <li key={e.exerciseId} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{EXERCISES[e.exerciseId].nameRu}</p>
              <Badge tone="band">{stepLabel(e.exerciseId, e.stepId)}</Badge>
            </div>
            <p className="tabular mt-0.5 text-[15px] text-muted">
              {e.skipped
                ? `Пропущено: ${SKIP_REASON_LABELS[e.skipped.reason].toLowerCase()}${e.skipped.note ? ` — ${e.skipped.note}` : ''}`
                : e.sets.length > 0
                  ? `${e.sets.map((s) => s.completedReps).join(' · ')} из ${e.targetSets} × ${formatRepRange(e.repMin, e.repMax, e.perSide)}${e.goodTechnique === false ? ' · техника страдала' : ''}`
                  : 'Не выполнялось'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
