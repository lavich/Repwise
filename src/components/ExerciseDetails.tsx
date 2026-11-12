import { Lightbulb, Wind, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Exercise } from '@/domain/types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

export function ExerciseSteps({ exercise }: { exercise: Exercise }) {
  return (
    <ol className="space-y-3">
      {exercise.steps.map((step, i) => (
        <li key={step} className="flex gap-3 text-base leading-snug">
          <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  )
}

export function ExerciseCautions({ exercise }: { exercise: Exercise }) {
  return (
    <div className="space-y-5">
      <Section title="Частые ошибки">
        <ul className="space-y-2">
          {exercise.commonMistakes.map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
              <XCircle className="mt-0.5 size-4 shrink-0 text-muted" />
              {item}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Советы">
        <ul className="space-y-2 rounded-2xl bg-surface-2 p-4">
          {exercise.tips.map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

export function ExerciseDetails({ exercise }: { exercise: Exercise }) {
  return (
    <div className="space-y-6">
      <Section title="Исходное положение">
        <p className="text-base leading-snug">{exercise.startingPosition}</p>
      </Section>
      <Section title="Выполнение">
        <ExerciseSteps exercise={exercise} />
      </Section>
      <Section title="Движение">
        <p className="text-base leading-snug">{exercise.movement}</p>
      </Section>
      <Section title="Дыхание">
        <p className="flex gap-2.5 text-base leading-snug">
          <Wind className="mt-0.5 size-5 shrink-0 text-info" />
          {exercise.breathing}
        </p>
      </Section>
      <ExerciseCautions exercise={exercise} />
    </div>
  )
}
