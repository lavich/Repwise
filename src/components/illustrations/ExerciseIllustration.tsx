import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ExerciseId } from '@/domain/types'
import { cn } from '@/lib/cn'
import { FRAMES, type LimbKind, type Point, type Prop } from './poses'
import { buildRig, cycleAt, DEFAULT_TEMPO, interpolatePose, type ResolvedPose } from './rig'

const FLOOR_Y = 128
const VIEW_BOX = '0 0 160 136'

const SEGMENT_WIDTHS: Record<LimbKind, number[]> = {
  torso: [13],
  girdle: [6],
  leg: [10, 8, 5],
  arm: [7, 6],
}

const toPoints = (points: readonly Point[]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

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
  }
}

// Every frame of the animation is written straight into the registered SVG
// elements, so React does not re-render the figure sixty times a second.
type Register = (key: string, element: SVGElement | null) => void

function applyPose(elements: Map<string, SVGElement>, pose: ResolvedPose) {
  pose.limbs.forEach((limb, i) => {
    for (let j = 1; j < limb.points.length; j++) {
      const line = elements.get(`segment-${i}-${j - 1}`)
      const [x1, y1] = limb.points[j - 1] as Point
      const [x2, y2] = limb.points[j] as Point
      line?.setAttribute('x1', x1.toFixed(1))
      line?.setAttribute('y1', y1.toFixed(1))
      line?.setAttribute('x2', x2.toFixed(1))
      line?.setAttribute('y2', y2.toFixed(1))
    }
  })
  elements.get('head')?.setAttribute('cx', pose.head[0].toFixed(1))
  elements.get('head')?.setAttribute('cy', pose.head[1].toFixed(1))
  pose.bands.forEach((line, i) => elements.get(`band-${i}`)?.setAttribute('points', toPoints(line)))
  if (pose.towel) elements.get('towel')?.setAttribute('x', (pose.towel[0] - 10).toFixed(1))
}

function Figure({ pose, props, register }: { pose: ResolvedPose; props?: Prop[]; register?: Register }) {
  const order = pose.limbs.map((limb, index) => ({ limb, index })).sort((a, b) => Number(b.limb.far) - Number(a.limb.far))
  return (
    <g strokeLinecap="round" fill="none">
      {props?.map((prop) => <PropShape key={prop} prop={prop} />)}
      {pose.towel && (
        <rect
          ref={(el) => register?.('towel', el)}
          x={pose.towel[0] - 10}
          y={FLOOR_Y - 5}
          width={20}
          height={5}
          rx={2}
          className="fill-info/60"
        />
      )}
      {order.map(({ limb, index }) =>
        limb.points.slice(1).map((point, j) => {
          const from = limb.points[j] as Point
          const widths = SEGMENT_WIDTHS[limb.kind]
          const width = widths[Math.min(j, widths.length - 1)] ?? 6
          return (
            <line
              key={`${index}-${j}`}
              ref={(el) => register?.(`segment-${index}-${j}`, el)}
              x1={from[0]}
              y1={from[1]}
              x2={point[0]}
              y2={point[1]}
              strokeWidth={width}
              className={limb.far ? 'stroke-muted/55' : 'stroke-fg'}
            />
          )
        }),
      )}
      <circle
        ref={(el) => register?.('head', el)}
        cx={pose.head[0]}
        cy={pose.head[1]}
        r={9}
        className="fill-fg"
      />
      {pose.bands.map((line, i) => (
        <polyline
          key={`band-${i}`}
          ref={(el) => register?.(`band-${i}`, el)}
          points={toPoints(line)}
          strokeWidth={3}
          strokeLinejoin="round"
          className="stroke-band"
        />
      ))}
    </g>
  )
}

function Floor() {
  return <line x1={8} x2={152} y1={FLOOR_Y} y2={FLOOR_Y} strokeWidth={2} className="stroke-border-strong" />
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches)
}

type PlayState = 'playing' | 'paused' | 'finished'


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
  const rig = useMemo(() => buildRig(frames), [frames])
  const startPose = useMemo(() => interpolatePose(rig, frames, 0), [rig, frames])
  const endPose = useMemo(() => interpolatePose(rig, frames, 1), [rig, frames])
  const reducedMotion = useReducedMotion()
  const startLabel = frames.startLabel ?? 'Начало'
  const endLabel = frames.endLabel ?? 'Конец'

  if (reducedMotion) {
    return (
      <div className={cn('flex gap-2 rounded-2xl bg-surface-2 p-3', className)}>
        {[
          { pose: startPose, label: startLabel },
          { pose: endPose, label: endLabel },
        ].map(({ pose, label }, i) => (
          <figure key={label + i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <svg viewBox={VIEW_BOX} className="h-auto w-full" role="img" aria-label={`${title}: ${label}`}>
              <Floor />
              <Figure pose={pose} props={frames.start.props} />
            </svg>
            <figcaption className="text-xs font-medium text-muted">{label}</figcaption>
          </figure>
        ))}
      </div>
    )
  }

  return (
    <AnimatedFigure
      key={exerciseId}
      rig={rig}
      frames={frames}
      startPose={startPose}
      title={title}
      startLabel={startLabel}
      endLabel={endLabel}
      className={className}
    />
  )
}

function AnimatedFigure({
  rig,
  frames,
  startPose,
  title,
  startLabel,
  endLabel,
  className,
}: {
  rig: ReturnType<typeof buildRig>
  frames: (typeof FRAMES)[ExerciseId]
  startPose: ResolvedPose
  title: string
  startLabel: string
  endLabel: string
  className?: string
}) {
  const [playState, setPlayState] = useState<PlayState>('playing')
  const container = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLSpanElement>(null)
  const elements = useRef(new Map<string, SVGElement>())
  const register = useCallback<Register>((key, element) => {
    if (element) elements.current.set(key, element)
    else elements.current.delete(key)
  }, [])
  const elapsed = useRef(0)

  useEffect(() => {
    if (playState !== 'playing') return
    const element = container.current
    if (!element) return
    let frame = 0
    let last: number | null = null
    let onScreen = true

    const tick = (now: number) => {
      if (last !== null) elapsed.current += now - last
      last = now
      const state = cycleAt(elapsed.current, frames.tempo ?? DEFAULT_TEMPO)
      applyPose(elements.current, interpolatePose(rig, frames, state.t))
      if (caption.current) caption.current.textContent = state.t >= 0.5 ? endLabel : startLabel
      if (state.finished) {
        elapsed.current = 0
        setPlayState('finished')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    const run = () => {
      cancelAnimationFrame(frame)
      last = null
      if (onScreen && document.visibilityState === 'visible') frame = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true
      run()
    })
    observer.observe(element)
    document.addEventListener('visibilitychange', run)
    run()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', run)
    }
  }, [playState, rig, frames, startLabel, endLabel])

  const control = {
    playing: { label: 'Пауза', icon: Pause, next: 'paused' as const },
    paused: { label: 'Запустить', icon: Play, next: 'playing' as const },
    finished: { label: 'Повторить', icon: RotateCcw, next: 'playing' as const },
  }[playState]
  const Icon = control.icon

  return (
    <div ref={container} className={cn('rounded-2xl bg-surface-2 p-3', className)}>
      <svg viewBox={VIEW_BOX} className="mx-auto h-auto w-full max-w-72" role="img" aria-label={`Анимация: ${title}`}>
        <Floor />
        <Figure pose={startPose} props={frames.start.props} register={register} />
      </svg>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span ref={caption} className="pl-1 text-[13px] font-medium text-muted" aria-hidden="true">
          {startLabel}
        </span>
        <button
          type="button"
          onClick={() => setPlayState(control.next)}
          className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted active:bg-surface"
        >
          <Icon className="size-4" />
          {control.label}
        </button>
      </div>
    </div>
  )
}
