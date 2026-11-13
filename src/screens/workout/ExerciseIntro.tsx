import { ExerciseCautions, ExerciseSteps } from '@/components/ExerciseDetails'
import { ExerciseIllustration } from '@/components/illustrations/ExerciseIllustration'
import { ExerciseMuscleMap } from '@/components/muscles/MuscleMap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EXERCISES, stepLabel } from '@/domain/exercises'
import type { SessionExercise } from '@/domain/types'
import { beginExercise } from '@/domain/workoutFlow'
import { formatMuscles, formatTarget } from '@/lib/format'
import { updateActive } from '@/state/actions'
import { BottomActions } from './BottomActions'

export function ExerciseIntro({ exercise }: { exercise: SessionExercise }) {
  const info = EXERCISES[exercise.exerciseId]

  return (
    <>
      <div className="space-y-5 pb-6">
        <div>
          <p className="text-[15px] font-medium text-muted">{info.nameEn}</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{info.nameRu}</h1>
          <p className="mt-1 text-[15px] text-muted first-letter:uppercase">{formatMuscles(info.muscles.primary)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="accent" className="tabular text-[15px]">
            {formatTarget(exercise.targetSets, exercise.repMin, exercise.repMax, exercise.perSide)}
          </Badge>
          <Badge tone="band" className="text-[15px]">
            {stepLabel(exercise.exerciseId, exercise.stepId)}
          </Badge>
        </div>

        <ExerciseIllustration exerciseId={info.id} title={info.nameRu} />
        <ExerciseMuscleMap muscles={info.muscles} />

        <section className="space-y-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Исходное положение</h2>
          <p className="text-base leading-snug">{info.startingPosition}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Как выполнять</h2>
          <ExerciseSteps exercise={info} />
          <p className="text-[15px] leading-snug text-muted">{info.breathing}</p>
        </section>

        <ExerciseCautions exercise={info} />
      </div>

      <BottomActions>
        <Button size="lg" className="w-full" onClick={() => updateActive(beginExercise)}>
          Начать упражнение
        </Button>
      </BottomActions>
    </>
  )
}
