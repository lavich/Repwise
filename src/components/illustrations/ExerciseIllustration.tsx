import { lazy, Suspense, type ReactNode } from 'react'
import { MODELS, PHASE_LABELS } from '@/components/model3d/models'
import { supportsWebGL } from '@/components/model3d/webgl'
import { EXERCISES } from '@/domain/exercises'
import { useAppData } from '@/state/store'
import type { ExerciseId } from '@/domain/types'
import { cn } from '@/lib/cn'
import { FIGURE_WIDTH, type FigureSize } from './figureSize'
import { PlaybackBar } from './PlaybackBar'

// A chunk that fails to load shows the same as a device without WebGL.
const Mannequin3D = lazy(() =>
  import('@/components/model3d/Mannequin3D').catch(() => ({
    default: ({ failedFallback }: { failedFallback: ReactNode }) => <>{failedFallback}</>,
  })),
)

// `whenUnavailable` is shown when the 3D model cannot be shown at all, e.g. the
// muscle map that the model would otherwise light up; without it nothing is shown.
export function ExerciseIllustration({
  exerciseId,
  title,
  size = 'regular',
  whenUnavailable,
  className,
}: {
  exerciseId: ExerciseId
  title: string
  size?: FigureSize
  whenUnavailable?: ReactNode
  className?: string
}) {
  const theme = useAppData().settings.theme
  const failed = whenUnavailable ? (
    <div className={cn('space-y-2', className)}>
      <p className="px-1 text-[13px] text-muted">3D-модель сейчас недоступна.</p>
      {whenUnavailable}
    </div>
  ) : null
  if (!supportsWebGL()) return failed
  const labels = PHASE_LABELS[exerciseId]
  const loading = <ModelPlaceholder title={title} size={size} className={className} />
  return (
    <Suspense fallback={loading}>
      <Mannequin3D
        key={exerciseId}
        model={MODELS[exerciseId]}
        muscles={EXERCISES[exerciseId].muscles}
        title={title}
        theme={theme}
        startLabel={labels?.start ?? 'Начало'}
        endLabel={labels?.end ?? 'Конец'}
        fallback={loading}
        failedFallback={failed}
        size={size}
        className={className}
      />
    </Suspense>
  )
}

function ModelPlaceholder({ title, size, className }: { title: string; size: FigureSize; className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-surface-2 p-3', className)} aria-busy="true" aria-label={`Загрузка модели: ${title}`}>
      <div className={cn('mx-auto aspect-[160/136] w-full', FIGURE_WIDTH[size])} />
      <PlaybackBar playState={null} onChange={() => {}} caption="" />
    </div>
  )
}
