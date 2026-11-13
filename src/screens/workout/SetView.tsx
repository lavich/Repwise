import { Check, Info } from 'lucide-react'
import { useState } from 'react'
import { ExerciseSteps } from '@/components/ExerciseDetails'
import { ExerciseIllustration } from '@/components/illustrations/ExerciseIllustration'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Stepper } from '@/components/ui/stepper'
import { EXERCISES, stepLabel } from '@/domain/exercises'
import { defaultReps, lastPerformance } from '@/domain/session'
import type { ActiveWorkout, SessionExercise } from '@/domain/types'
import { completeSet } from '@/domain/workoutFlow'
import { unlockAudio } from '@/lib/device'
import { cn } from '@/lib/cn'
import { formatRepGoal } from '@/lib/format'
import { updateActive } from '@/state/actions'
import { getData, useAppData } from '@/state/store'
import { BottomActions } from './BottomActions'

export function SetView({ active, exercise }: { active: ActiveWorkout; exercise: SessionExercise }) {
  const info = EXERCISES[exercise.exerciseId]
  const setNumber = exercise.sets.length + 1
  const { sessions } = useAppData()
  const previous = lastPerformance(sessions, exercise.exerciseId, exercise.stepId)
  const [reps, setReps] = useState(() => defaultReps(previous, setNumber, exercise.repMin))
  const [techniqueOpen, setTechniqueOpen] = useState(false)

  const submit = () => {
    unlockAudio()
    updateActive((current) =>
      current.phase === 'set' &&
      current.exerciseIndex === active.exerciseIndex &&
      current.session.exercises[current.exerciseIndex]?.sets.length === exercise.sets.length
        ? completeSet(current, reps, getData().settings.restSeconds, new Date())
        : current,
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold tracking-tight">{info.nameRu}</h1>
            <p className="mt-1 text-[15px] text-muted">Ступень: {stepLabel(exercise.exerciseId, exercise.stepId)}</p>
          </div>
          <Button variant="secondary" size="icon" className="rounded-full" onClick={() => setTechniqueOpen(true)} aria-label="Показать технику">
            <Info className="size-5" />
          </Button>
        </div>

        <ExerciseIllustration exerciseId={info.id} title={info.nameRu} size="compact" className="mt-3" />

        <div className="mt-3 flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: exercise.targetSets }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-10 rounded-full',
                i < exercise.sets.length ? 'bg-accent' : i === exercise.sets.length ? 'bg-fg' : 'bg-surface-2',
              )}
            />
          ))}
        </div>
        <p className="mt-4 text-center text-lg font-semibold">
          Подход {setNumber} из {exercise.targetSets}
        </p>
        <p className="tabular text-center text-[15px] text-muted">
          Цель: {formatRepGoal(exercise.repMin, exercise.repMax, exercise.perSide)}, за 1–2 до отказа
        </p>
        {previous && (
          <p className="tabular mt-1 text-center text-[15px]">
            В прошлый раз: <span className="font-semibold">{previous.join(' · ')}</span>
          </p>
        )}

        <div className="my-auto py-8">
          <Stepper value={reps} onChange={setReps} max={exercise.repMax * 2} label="Выполнено повторов" />
          <p className="mt-3 text-center text-[15px] text-muted">
            {exercise.perSide
              ? 'Повторы слабой стороны с хорошей техникой'
              : 'Сколько повторов сделано с хорошей техникой'}
          </p>
          {reps < exercise.repMin && (
            <div className="mt-3 flex justify-center">
              <Badge tone="warning">Меньше цели — это нормально, не дожимайте через боль</Badge>
            </div>
          )}
        </div>
      </div>

      <BottomActions>
        <Button size="lg" className="w-full" onClick={submit}>
          <Check className="size-5" strokeWidth={3} />
          Подход выполнен
        </Button>
      </BottomActions>

      <Sheet open={techniqueOpen} onClose={() => setTechniqueOpen(false)} title={info.nameRu}>
        <div className="space-y-5">
          <ExerciseSteps exercise={info} />
          <p className="text-[15px] text-muted">{info.breathing}</p>
        </div>
      </Sheet>
    </>
  )
}
