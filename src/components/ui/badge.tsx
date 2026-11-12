import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-fg',
      accent: 'bg-accent/15 text-accent',
      band: 'bg-band/15 text-band',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
