import { useState } from 'react'
import type { SeriesPoint } from '@/domain/stats'
import { formatShortDay } from '@/lib/format'

const WIDTH = 340
const HEIGHT = 168
const PAD = { top: 16, right: 12, bottom: 24, left: 28 }

interface TrendChartProps {
  points: SeriesPoint[]
  kind: 'line' | 'bar'
  label: string
  unit: string
  yMax?: number
  bands?: { from: number; to: number; className: string }[]
}

function niceMax(value: number): number {
  if (value <= 10) return 10
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

export function TrendChart({ points, kind, label, unit, yMax, bands = [] }: TrendChartProps) {
  const [selected, setSelected] = useState<number | null>(null)
  if (points.length === 0) {
    return <p className="py-8 text-center text-[15px] text-muted">Данные появятся после первой тренировки</p>
  }

  const max = yMax ?? niceMax(Math.max(...points.map((p) => p.value)))
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const step = plotW / points.length
  const x = (i: number) => PAD.left + step * i + step / 2
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  const ticks = [0, max / 2, max]
  const active = selected ?? points.length - 1
  const activePoint = points[active]
  const labelEvery = Math.ceil(points.length / 6)

  return (
    <div>
      <p className="tabular mb-1 text-[15px]" aria-live="polite">
        {activePoint && (
          <>
            <span className="font-semibold">
              {activePoint.value} {unit}
            </span>
            <span className="text-muted"> · {formatShortDay(activePoint.date)}</span>
          </>
        )}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full touch-pan-y" role="img" aria-label={label}>
        {bands.map((band) => (
          <rect
            key={band.from}
            x={PAD.left}
            width={plotW}
            y={y(band.to)}
            height={y(band.from) - y(band.to)}
            className={band.className}
          />
        ))}
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" className="tabular fill-muted text-[10px]">
              {Math.round(tick)}
            </text>
          </g>
        ))}
        {kind === 'bar' &&
          points.map((p, i) => {
            const barW = Math.min(22, step - 2)
            const top = y(p.value)
            const h = Math.max(0, PAD.top + plotH - top)
            const r = Math.min(4, h, barW / 2)
            const left = x(i) - barW / 2
            const bottom = PAD.top + plotH
            return (
              <path
                key={p.date}
                d={`M${left},${bottom} V${top + r} Q${left},${top} ${left + r},${top} H${left + barW - r} Q${left + barW},${top} ${left + barW},${top + r} V${bottom} Z`}
                className={i === active ? 'fill-accent' : 'fill-accent/45'}
              />
            )
          })}
        {kind === 'line' && (
          <>
            <polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-accent"
            />
            {points.map((p, i) => (
              <circle
                key={p.date}
                cx={x(i)}
                cy={y(p.value)}
                r={i === active ? 5 : 4}
                strokeWidth={2}
                className={i === active ? 'fill-accent stroke-surface' : 'fill-surface stroke-accent'}
              />
            ))}
          </>
        )}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={`l-${p.date}`} x={x(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted text-[10px]">
              {formatShortDay(p.date)}
            </text>
          ) : null,
        )}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.date}`}
            x={x(i) - step / 2}
            y={0}
            width={step}
            height={HEIGHT}
            fill="transparent"
            onPointerDown={() => setSelected(i)}
            onPointerEnter={() => setSelected(i)}
          />
        ))}
      </svg>
    </div>
  )
}
