import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string | number> {
  value: T
  label: string
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T | null
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 min-w-0 flex-1 rounded-xl px-2 text-[15px] font-semibold transition-colors',
              selected ? 'bg-fg text-bg' : 'text-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
