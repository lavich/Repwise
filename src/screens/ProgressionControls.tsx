import { ChoiceRow } from '@/components/ui/choice'
import { EXERCISES } from '@/domain/exercises'
import { BAND_RANGES } from '@/lib/format'
import type { ExerciseId } from '@/domain/types'
import { changeStep } from '@/state/actions'
import { useAppData } from '@/state/store'

export function ProgressionControls({ exerciseId }: { exerciseId: ExerciseId }) {
  const current = useAppData().progression[exerciseId].stepId
  const exercise = EXERCISES[exerciseId]

  return (
    <section className="space-y-3 rounded-2xl border border-border p-4">
      <div>
        <h3 className="font-semibold">Ваша ступень</h3>
        <p className="text-[13px] text-muted">
          От лёгкой к тяжёлой. Можно выбрать вручную — рекомендации сменят её только с вашего согласия.
        </p>
      </div>
      <div className="space-y-2" role="radiogroup" aria-label="Ступень сопротивления">
        {exercise.loadSteps.map((step) => (
          <ChoiceRow key={step.id} selected={step.id === current} onClick={() => changeStep(exerciseId, step.id)}>
            <span className="block">{step.label}</span>
            {step.bands.length > 0 && (
              <span className="block text-[13px] font-normal text-muted">
                {step.bands.map((band) => `${band}: ${BAND_RANGES[band]}`).join(' + ')}
              </span>
            )}
          </ChoiceRow>
        ))}
      </div>
    </section>
  )
}
