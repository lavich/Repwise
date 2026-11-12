import type { ExerciseId } from '@/domain/types'
import { cn } from '@/lib/cn'
import { FRAMES, type Point, type Pose, type Prop } from './poses'

const FLOOR_Y = 128

const toPoints = (points: readonly Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ')

function PropShape({ prop }: { prop: Prop }) {
  switch (prop) {
    case 'chair-left':
      return (
        <g className="stroke-muted" strokeWidth={4} fill="none" strokeLinecap="round">
          <polyline points="16,52 16,126" />
          <polyline points="16,92 48,92 48,126" />
        </g>
      )
    case 'step':
      return <rect x={80} y={116} width={44} height={12} rx={2} className="fill-muted/50" />
    case 'mat':
      return <rect x={14} y={FLOOR_Y - 2} width={140} height={4} rx={2} className="fill-accent/40" />
    case 'towel-far':
      return <rect x={130} y={FLOOR_Y - 5} width={20} height={5} rx={2} className="fill-info/60" />
    case 'towel-near':
      return <rect x={108} y={FLOOR_Y - 5} width={20} height={5} rx={2} className="fill-info/60" />
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
      {pose.bands?.map((line, i) => (
        <polyline key={`band-${i}`} points={toPoints(line)} strokeWidth={3} className="stroke-band" />
      ))}
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
