import { lazy, Suspense, type ReactNode } from 'react'
import { supportsWebGL } from '@/components/model3d/webgl'
import type { MuscleLevel } from '@/components/model3d/models'
import { MUSCLE_IDS, type ExerciseMuscles, type MuscleId } from '@/domain/types'
import { useAppData } from '@/state/store'
import { loadLevel, type LoadLevel, type MuscleLoad } from '@/domain/stats'
import { cn } from '@/lib/cn'
import { formatMuscles } from '@/lib/format'
import { MUSCLE_REGIONS, SILHOUETTE, type BodySide } from './bodyMap'

const LEVEL_FILL: Record<LoadLevel, string> = {
  0: 'fill-muscle-0',
  1: 'fill-muscle-1',
  2: 'fill-muscle-2',
  3: 'fill-muscle-3',
}

const LEVEL_BG: Record<LoadLevel, string> = {
  0: 'bg-muscle-0',
  1: 'bg-muscle-1',
  2: 'bg-muscle-2',
  3: 'bg-muscle-3',
}

const SIDE_LABELS: Record<BodySide, string> = { front: 'Спереди', back: 'Сзади' }

function Body({ side, levelOf }: { side: BodySide; levelOf: (muscle: MuscleId) => LoadLevel }) {
  return (
    <figure className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <svg viewBox="0 0 100 212" className="h-auto w-full max-w-32" aria-hidden="true">
        {SILHOUETTE.map((path) => (
          <path key={path} d={path} strokeWidth={1.2} strokeLinejoin="round" className="fill-body stroke-muted/50" />
        ))}
        {MUSCLE_REGIONS.filter((region) => region.side === side).map((region) => (
          <path key={region.path} d={region.path} data-muscle={region.muscle} className={LEVEL_FILL[levelOf(region.muscle)]} />
        ))}
      </svg>
      <figcaption className="text-xs font-medium text-muted">{SIDE_LABELS[side]}</figcaption>
    </figure>
  )
}

function BodyPair({ levelOf, label, className }: { levelOf: (m: MuscleId) => LoadLevel; label?: string; className?: string }) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('flex justify-center gap-4', className)}
    >
      <Body side="front" levelOf={levelOf} />
      <Body side="back" levelOf={levelOf} />
    </div>
  )
}

// A chunk that fails to load falls back to the SVG map.
const MuscleModel3D = lazy(() =>
  import('@/components/model3d/MuscleModel3D').catch(() => ({
    default: ({ fallback }: { fallback: ReactNode }) => <>{fallback}</>,
  })),
)

function MuscleFigures({ levels, label, fallback }: { levels: MuscleLevel[]; label: string; fallback: ReactNode }) {
  const theme = useAppData().settings.theme
  if (!supportsWebGL()) return <>{fallback}</>
  const loading = <div role="img" aria-label={label} className="mx-auto aspect-square w-full max-w-72" />
  return (
    <Suspense fallback={loading}>
      <MuscleModel3D levels={levels} theme={theme} label={label} loading={loading} fallback={fallback} />
    </Suspense>
  )
}

export function MuscleList({ muscles, className }: { muscles: ExerciseMuscles; className?: string }) {
  const primary = formatMuscles(muscles.primary)
  const secondary = formatMuscles(muscles.secondary)
  return (
    <dl className={cn('space-y-1 text-[15px] leading-snug', className)}>
      <div className="flex gap-2">
        <span className={cn('mt-1.5 size-3 shrink-0 rounded-full', LEVEL_BG[3])} aria-hidden="true" />
        <dt className="text-muted">Основные:</dt>
        <dd className="font-medium">{primary}</dd>
      </div>
      {secondary && (
        <div className="flex gap-2">
          <span className={cn('mt-1.5 size-3 shrink-0 rounded-full', LEVEL_BG[1])} aria-hidden="true" />
          <dt className="text-muted">Вспомогательные:</dt>
          <dd className="font-medium">{secondary}</dd>
        </div>
      )}
    </dl>
  )
}

// Shown only when the 3D model, which lights up the muscles itself, is unavailable.
export function MuscleSchematic({ muscles }: { muscles: ExerciseMuscles }) {
  const levelOf = (m: MuscleId): LoadLevel => (muscles.primary.includes(m) ? 3 : muscles.secondary.includes(m) ? 1 : 0)
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <BodyPair levelOf={levelOf} />
    </div>
  )
}

const LEGEND: { level: LoadLevel; label: string }[] = [
  { level: 0, label: '0' },
  { level: 1, label: 'меньше 5' },
  { level: 2, label: '5–9,5' },
  { level: 3, label: '10+' },
]

export function LoadMuscleMap({ load, className }: { load: MuscleLoad; className?: string }) {
  return (
    <div className={className}>
      <MuscleFigures
        levels={[0, ...MUSCLE_IDS.map((id) => loadLevel(load[id]))]}
        label="Нагрузка по мышцам за неделю, подробности в списке ниже"
        fallback={<BodyPair levelOf={(m) => loadLevel(load[m])} label="Нагрузка по мышцам за неделю, подробности в списке ниже" />}
      />
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-muted" aria-hidden="true">
        {LEGEND.map(({ level, label }) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={cn('size-3 rounded-full', LEVEL_BG[level])} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
