import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ExerciseDetails } from '@/components/ExerciseDetails'
import { ExerciseIllustration } from '@/components/illustrations/ExerciseIllustration'
import { ScopeNotice } from '@/components/SafetyNotice'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Badge } from '@/components/ui/badge'
import { Card, SectionTitle } from '@/components/ui/card'
import { Sheet } from '@/components/ui/sheet'
import { EXERCISES } from '@/domain/exercises'
import { WORKOUTS } from '@/domain/program'
import type { ExerciseId } from '@/domain/types'
import { useAppData } from '@/state/store'
import { ProgressionControls } from './ProgressionControls'

export function LibraryScreen() {
  const data = useAppData()
  const [selected, setSelected] = useState<ExerciseId | null>(null)
  const exercise = selected ? EXERCISES[selected] : null

  return (
    <>
      <ScreenHeader title="Упражнения" subtitle="Библиотека техники" />
      <div className="space-y-6">
        {Object.values(WORKOUTS).map((workout) => (
          <section key={workout.id}>
            <SectionTitle>
              {workout.title} · {workout.subtitle}
            </SectionTitle>
            <Card className="divide-y divide-border p-0">
              {workout.exercises.map(({ exerciseId }) => {
                const info = EXERCISES[exerciseId]
                const state = data.progression[exerciseId]
                return (
                  <button
                    key={exerciseId}
                    type="button"
                    onClick={() => setSelected(exerciseId)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{info.nameRu}</span>
                      <span className="block truncate text-[13px] text-muted">{info.nameEn}</span>
                    </span>
                    {state.band && <Badge tone="band">{state.band}</Badge>}
                    <Badge>Ур. {state.level}</Badge>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </button>
                )
              })}
            </Card>
          </section>
        ))}
        <ScopeNotice />
      </div>

      <Sheet open={exercise !== null} onClose={() => setSelected(null)} title={exercise?.nameRu ?? ''}>
        {exercise && (
          <div className="space-y-6">
            <div>
              <p className="text-[15px] text-muted">{exercise.nameEn}</p>
              <p className="mt-1 text-base leading-snug">{exercise.summary}</p>
            </div>
            <ExerciseIllustration exerciseId={exercise.id} title={exercise.nameRu} />
            <ProgressionControls exerciseId={exercise.id} />
            <ExerciseDetails exercise={exercise} />
          </div>
        )}
      </Sheet>
    </>
  )
}
