import { Plus, SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { EXERCISES } from '@/domain/exercises'
import type { ActiveWorkout, SessionExercise } from '@/domain/types'
import { extendRest, finishRest } from '@/domain/workoutFlow'
import { signalRestFinished } from '@/lib/device'
import { formatClock, formatRepGoal } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { updateActive } from '@/state/actions'
import { useAppData } from '@/state/store'
import { BottomActions } from './BottomActions'

const RADIUS = 92
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RestView({ active, exercise }: { active: ActiveWorkout; exercise: SessionExercise }) {
  const settings = useAppData().settings
  const now = useNow(true)
  const endsAt = active.restEndsAt ? Date.parse(active.restEndsAt) : now
  const remaining = Math.max(0, (endsAt - now) / 1000)
  const total = Math.max(EXERCISES[exercise.exerciseId].restSeconds ?? settings.restSeconds, remaining)
  const signalled = useRef(false)

  useEffect(() => {
    if (remaining > 0 || signalled.current) return
    signalled.current = true
    signalRestFinished()
    updateActive((current) => (current.phase === 'rest' ? finishRest(current) : current))
  }, [remaining])

  const nextSet = exercise.sets.length + 1

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        <p className="text-lg font-semibold text-muted">Отдых</p>
        <div className="relative size-60">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
            <circle cx={100} cy={100} r={RADIUS} strokeWidth={10} fill="none" className="stroke-surface-2" />
            <circle
              cx={100}
              cy={100}
              r={RADIUS}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              className="stroke-accent transition-[stroke-dashoffset] duration-300 ease-linear"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - remaining / total)}
            />
          </svg>
          <p className="tabular absolute inset-0 flex items-center justify-center text-6xl font-bold" role="timer" aria-live="off">
            {formatClock(remaining)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[15px] text-muted">Далее</p>
          <p className="text-lg font-semibold">
            Подход {nextSet} из {exercise.targetSets} · {formatRepGoal(exercise.repMin, exercise.repMax, exercise.perSide)}
          </p>
        </div>
        <p className="max-w-xs text-center text-[15px] text-muted">
          Дышите спокойно и восстановитесь, чтобы следующий подход был близок к отказу.
        </p>
      </div>
      <BottomActions>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={() => updateActive((a) => extendRest(a, 15, new Date()))}>
            <Plus className="size-5" />
            15 сек
          </Button>
          <Button variant="secondary" size="lg" onClick={() => updateActive(finishRest)}>
            <SkipForward className="size-5" />
            Дальше
          </Button>
        </div>
      </BottomActions>
    </>
  )
}
