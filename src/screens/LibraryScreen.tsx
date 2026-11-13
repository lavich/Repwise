import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { ExerciseDetails } from '@/components/ExerciseDetails'
import { ExerciseIllustration } from '@/components/illustrations/ExerciseIllustration'
import { MuscleList, MuscleSchematic } from '@/components/muscles/MuscleMap'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Badge } from '@/components/ui/badge'
import { Card, SectionTitle } from '@/components/ui/card'
import { Sheet } from '@/components/ui/sheet'
import { EXERCISES, stepLabel } from '@/domain/exercises'
import { WORKOUTS } from '@/domain/program'
import type { ExerciseId } from '@/domain/types'
import { formatTarget } from '@/lib/format'
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
              {workout.exerciseIds.map((exerciseId) => {
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
                    <Badge tone="band" className="max-w-[40%] shrink-0">
                      <span className="truncate">{stepLabel(exerciseId, state.stepId)}</span>
                    </Badge>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </button>
                )
              })}
            </Card>
          </section>
        ))}
      </div>

      <Sheet open={exercise !== null} onClose={() => setSelected(null)} title={exercise?.nameRu ?? ''}>
        {exercise && (
          <div className="space-y-6">
            <div>
              <p className="text-[15px] text-muted">{exercise.nameEn}</p>
              <p className="mt-1 text-base leading-snug">{exercise.summary}</p>
              <p className="tabular text-[15px]">
                <span className="text-muted">Подходы и повторы:</span>{' '}
                {formatTarget(exercise.sets, exercise.repRange.min, exercise.repRange.max, exercise.perSide)}
              </p>
            </div>
            <div className="space-y-3">
              <ExerciseIllustration
                exerciseId={exercise.id}
                title={exercise.nameRu}
                whenUnavailable={<MuscleSchematic muscles={exercise.muscles} />}
              />
              <MuscleList muscles={exercise.muscles} className="px-1" />
            </div>
            <ProgressionControls exerciseId={exercise.id} />
            <ExerciseDetails exercise={exercise} />
          </div>
        )}
      </Sheet>
    </>
  )
}
