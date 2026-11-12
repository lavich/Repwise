import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function ChoiceRow({
  selected,
  onClick,
  children,
  role = 'radio',
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  role?: 'radio' | 'checkbox'
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors',
        selected ? 'border-accent bg-accent/10' : 'border-border bg-surface-2',
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong',
        )}
      >
        {selected && <Check className="size-4" strokeWidth={3} />}
      </span>
    </button>
  )
}
