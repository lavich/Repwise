import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-border bg-surface p-4', className)} {...props} />
}

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('px-1 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted', className)} {...props} />
}
