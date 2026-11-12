import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EXERCISES } from '@/domain/exercises'
import type { SessionExercise } from '@/domain/types'
import { answerTechnique } from '@/domain/workoutFlow'
import { updateActive } from '@/state/actions'

export function TechniqueView({ exercise }: { exercise: SessionExercise }) {
  const info = EXERCISES[exercise.performedExerciseId]
  const reps = exercise.sets.map((s) => s.completedReps).join(' · ')
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 pb-10">
      <div className="text-center">
        <p className="text-[15px] font-medium text-muted">{info.nameRu} — готово</p>
        <p className="tabular mt-1 text-2xl font-bold">{reps}</p>
        <h1 className="mx-auto mt-8 max-w-xs text-2xl leading-tight font-bold tracking-tight">
          Техника сохранялась во всех подходах?
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted">
          Ответ влияет на рекомендацию: прибавлять нагрузку стоит только при хорошей технике.
        </p>
      </div>
      <div className="grid gap-3">
        <Button size="lg" onClick={() => updateActive((a) => (a.phase === 'technique' ? answerTechnique(a, true) : a))}>
          <ThumbsUp className="size-5" />
          Да, всё под контролем
        </Button>
        <Button variant="secondary" size="lg" onClick={() => updateActive((a) => (a.phase === 'technique' ? answerTechnique(a, false) : a))}>
          <ThumbsDown className="size-5" />
          Нет, техника страдала
        </Button>
      </div>
    </div>
  )
}
