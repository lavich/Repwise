import type { ExerciseId } from '@/domain/types'
import { cn } from '@/lib/cn'
import { FRAMES, type Point, type Pose, type Prop } from './poses'

const FLOOR_Y = 128

const toPoints = (points: readonly Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ')

function PropShape({ prop }: { prop: Prop }) {
  switch (prop) {
    case 'chair':
      return (
        <g className="stroke-muted" strokeWidth={4} fill="none" strokeLinecap="round">
          <polyline points="40,52 40,126" />
          <polyline points="40,92 72,92 72,126" />
        </g>
      )
    case 'chair-back-right':
      return (
        <g className="stroke-muted" strokeWidth={4} fill="none" strokeLinecap="round">
          <polyline points="110,54 110,126" />
          <polyline points="110,92 136,92 136,126" />
        </g>
      )
    case 'post-left':
      return (
        <g className="stroke-muted" strokeWidth={4} fill="none" strokeLinecap="round">
          <polyline points="40,58 64,58" />
          <polyline points="44,58 44,126" />
          <polyline points="60,58 60,126" />
        </g>
      )
    case 'mat':
      return <rect x={14} y={FLOOR_Y - 2} width={140} height={4} rx={2} className="fill-accent/40" />
    case 'pillow':
      return <rect x={16} y={110} width={26} height={10} rx={5} className="fill-muted/50" />
  }
}

function Figure({ pose }: { pose: Pose }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {pose.props?.map((prop) => <PropShape key={prop} prop={prop} />)}
      {pose.far?.map((limb, i) => (
        <polyline key={`far-${i}`} points={toPoints(limb)} strokeWidth={6} className="stroke-muted/60" />
      ))}
      {pose.near.map((limb, i) => (
        <polyline key={`near-${i}`} points={toPoints(limb)} strokeWidth={6} className="stroke-fg" />
      ))}
      <circle cx={pose.head[0]} cy={pose.head[1]} r={9} className="fill-fg" />
      {pose.band && (
        <polyline points={toPoints(pose.band)} strokeWidth={5} className="stroke-band" />
      )}
    </g>
  )
}

function Frame({ pose, label }: { pose: Pose; label: string }) {
  return (
    <figure className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <svg viewBox="0 0 160 136" className="h-auto w-full" aria-hidden="true">
        <line x1={8} x2={152} y1={FLOOR_Y} y2={FLOOR_Y} strokeWidth={2} className="stroke-border-strong" />
        <Figure pose={pose} />
      </svg>
      <figcaption className="text-xs font-medium text-muted">{label}</figcaption>
    </figure>
  )
}

export function ExerciseIllustration({
  exerciseId,
  title,
  className,
}: {
  exerciseId: ExerciseId
  title: string
  className?: string
}) {
  const frames = FRAMES[exerciseId]
  return (
    <div role="img" aria-label={`Техника: ${title}`} className={cn('flex gap-2 rounded-2xl bg-surface-2 p-3', className)}>
      <Frame pose={frames.start} label={frames.startLabel ?? 'Начало'} />
      <div className="w-px self-stretch bg-border" />
      <Frame pose={frames.end} label={frames.endLabel ?? 'Конец'} />
    </div>
  )
}
