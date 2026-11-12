import { Minus, Plus } from 'lucide-react'
import { Button } from './button'

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-3" role="group" aria-label={label}>
      <Button variant="secondary" size="icon" className="size-16 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Меньше">
        <Minus className="size-7" />
      </Button>
      <output aria-live="polite" className="tabular min-w-24 text-center text-7xl font-bold tracking-tight">
        {value}
      </output>
      <Button variant="secondary" size="icon" className="size-16 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Больше">
        <Plus className="size-7" />
      </Button>
    </div>
  )
}
