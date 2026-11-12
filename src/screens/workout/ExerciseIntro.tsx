import { Repeat } from 'lucide-react'
import { ExerciseCautions, ExerciseSteps } from '@/components/ExerciseDetails'
import { ExerciseIllustration } from '@/components/illustrations/ExerciseIllustration'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EXERCISES } from '@/domain/exercises'
import type { ActiveWorkout, SessionExercise } from '@/domain/types'
import { beginExercise, switchCurrentToAlternative } from '@/domain/workoutFlow'
import { equipmentLabel, formatPrescription } from '@/lib/format'
import { updateActive } from '@/state/actions'
import { BottomActions } from './BottomActions'

export function ExerciseIntro({ active, exercise }: { active: ActiveWorkout; exercise: SessionExercise }) {
  const info = EXERCISES[exercise.performedExerciseId]
  const planned = EXERCISES[exercise.plannedExerciseId]
  const alternative = planned.alternativeId && exercise.performedExerciseId === exercise.plannedExerciseId
    ? EXERCISES[planned.alternativeId]
    : null
  const band = info.equipment.kind === 'band' ? exercise.band : null
  const nextIsFloor = info.position === 'floor' && active.exerciseIndex > 0 &&
    EXERCISES[active.session.exercises[active.exerciseIndex - 1]?.performedExerciseId ?? info.id].position === 'standing'

  return (
    <>
      <div className="space-y-5 pb-6">
        <div>
          <p className="text-[15px] font-medium text-muted">{info.nameEn}</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{info.nameRu}</h1>
          {exercise.performedExerciseId !== exercise.plannedExerciseId && (
            <p className="mt-1 text-[15px] text-muted">Замена для «{planned.nameRu}»</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="accent" className="tabular text-[15px]">
            {formatPrescription(exercise.targetSets, exercise.targetReps)}
          </Badge>
          <Badge tone={band ? 'band' : 'neutral'} className="text-[15px]">
            {equipmentLabel(info.equipment, band)}
          </Badge>
        </div>

        {nextIsFloor && (
          <p className="rounded-2xl bg-warning-soft p-4 text-[15px] leading-snug">
            Дальше упражнения на полу. Опускайтесь медленно: сначала на колени, затем на бок.
          </p>
        )}

        <ExerciseIllustration exerciseId={info.id} title={info.nameRu} />

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
        {alternative && (
          <Button variant="secondary" className="w-full" onClick={() => updateActive(switchCurrentToAlternative)}>
            <Repeat className="size-4" />
            Заменить на «{alternative.nameRu}»
          </Button>
        )}
        <Button size="lg" className="w-full" onClick={() => updateActive(beginExercise)}>
          Начать упражнение
        </Button>
      </BottomActions>
    </>
  )
}
