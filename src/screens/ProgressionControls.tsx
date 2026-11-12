import { Segmented } from '@/components/ui/segmented'
import { ChoiceRow } from '@/components/ui/choice'
import { EXERCISES } from '@/domain/exercises'
import { prescriptionFor, toLevel } from '@/domain/program'
import { BAND_LEVELS, type ExerciseId } from '@/domain/types'
import { BAND_RANGES, formatPrescription } from '@/lib/format'
import { changeProgression } from '@/state/actions'
import { useAppData } from '@/state/store'

export function ProgressionControls({ exerciseId }: { exerciseId: ExerciseId }) {
  const state = useAppData().progression[exerciseId]
  const exercise = EXERCISES[exerciseId]
  const alternative = exercise.alternativeId ? EXERCISES[exercise.alternativeId] : null
  const levels = ([1, 2, 3, 4] as const).map((level) => {
    const rx = prescriptionFor(exerciseId, level)
    return { value: level, label: formatPrescription(rx.sets, rx.reps) }
  })

  return (
    <section className="space-y-4 rounded-2xl border border-border p-4">
      <div>
        <h3 className="font-semibold">Ваша нагрузка</h3>
        <p className="text-[13px] text-muted">Можно изменить вручную — рекомендации это не перезапишут без вашего согласия.</p>
      </div>
      <div className="space-y-2">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Подходы × повторы (уровень недели)</p>
        <Segmented
          value={state.level}
          options={levels}
          onChange={(level) => changeProgression(exerciseId, { level: toLevel(level) })}
          label="Уровень"
        />
      </div>
      {exercise.equipment.kind === 'band' && (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Лента</p>
          <Segmented
            value={state.band ?? 'L1'}
            options={BAND_LEVELS.map((band) => ({ value: band, label: band }))}
            onChange={(band) => {
              if (band === 'L3' && !window.confirm('L3 (25–65 кг) не вводится автоматически. Точно перейти на L3?')) return
              changeProgression(exerciseId, { band })
            }}
            label="Лента"
          />
          <p className="text-[13px] text-muted">
            {state.band ? `${state.band}: ${BAND_RANGES[state.band]} по данным производителя.` : null}{' '}
            {exercise.allowedBands.includes('L2') ? 'L2 допустима, когда L1 стала комфортной.' : 'Рекомендуется L1.'}
          </p>
        </div>
      )}
      {alternative && (
        <ChoiceRow
          role="checkbox"
          selected={state.useAlternative}
          onClick={() => changeProgression(exerciseId, { useAlternative: !state.useAlternative })}
        >
          Выполнять «{alternative.nameRu}» вместо этого упражнения
        </ChoiceRow>
      )}
    </section>
  )
}
