import { CheckCircle2, OctagonX } from 'lucide-react'
import { SuggestionCard } from '@/components/SuggestionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, SectionTitle } from '@/components/ui/card'
import { EXERCISES } from '@/domain/exercises'
import { WORKOUTS } from '@/domain/program'
import { hadPain, isActionable } from '@/domain/progression'
import { sessionVolume } from '@/domain/session'
import { DECISION_LABELS, formatDuration } from '@/lib/format'
import { useAppData } from '@/state/store'

export function SummaryScreen({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const data = useAppData()
  const session = data.sessions.find((s) => s.id === sessionId)
  const suggestions = data.pendingSuggestions.filter((s) => s.sessionId === sessionId)
  const actionable = suggestions.filter(isActionable)
  const informational = suggestions.filter((s) => !isActionable(s))
  const stopped = session?.status === 'stopped'
  const painful = session ? hadPain(session) : false

  return (
    <div className="pt-safe fixed inset-0 flex flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="pb-safe mx-auto max-w-lg px-4">
          {session && (
            <>
              <div className="flex flex-col items-center pt-8 pb-6 text-center">
                {stopped ? (
                  <OctagonX className="size-14 text-warning" />
                ) : (
                  <CheckCircle2 className="size-14 text-accent" />
                )}
                <h1 className="mt-3 text-[28px] font-bold tracking-tight">
                  {stopped ? 'Тренировка сохранена' : 'Отличная работа'}
                </h1>
                <p className="text-[15px] text-muted">{WORKOUTS[session.workoutId].title}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: formatDuration(session.startedAt, session.finishedAt), label: 'время' },
                  { value: String(sessionVolume(session)), label: 'повторов' },
                  { value: session.feedback ? `RPE ${session.feedback.rpe}` : '—', label: 'нагрузка' },
                ].map((item) => (
                  <Card key={item.label} className="p-3 text-center">
                    <p className="tabular text-xl font-bold">{item.value}</p>
                    <p className="text-[13px] text-muted">{item.label}</p>
                  </Card>
                ))}
              </div>

              {actionable.length > 0 && (
                <section className="mt-6">
                  <SectionTitle>Рекомендации</SectionTitle>
                  <p className="mb-3 px-1 text-[15px] text-muted">
                    Ничего не меняется автоматически. Примите рекомендацию или оставьте всё как есть — решить можно и позже на
                    главном экране.
                  </p>
                  <div className="space-y-3">
                    {actionable.map((s) => (
                      <SuggestionCard key={s.id} suggestion={s} />
                    ))}
                  </div>
                </section>
              )}

              {informational.length > 0 && (
                <section className="mt-6">
                  <SectionTitle>Без изменений</SectionTitle>
                  <Card className="divide-y divide-border p-0">
                    {informational.map((s) => (
                      <div key={s.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 pt-0.5 font-semibold">{EXERCISES[s.exerciseId].nameRu}</p>
                          <Badge tone={s.kind === 'pain-hold' && painful ? 'danger' : 'neutral'} className="shrink-0">
                            {DECISION_LABELS[s.kind]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[15px] leading-snug text-muted">{s.reason}</p>
                      </div>
                    ))}
                  </Card>
                </section>
              )}
            </>
          )}

          <Button size="lg" className="mt-8 mb-4 w-full" onClick={onClose}>
            На главную
          </Button>
        </div>
      </main>
    </div>
  )
}
