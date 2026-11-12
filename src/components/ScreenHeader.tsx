import type { ReactNode } from 'react'

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-4 pb-5">
      <div className="min-w-0">
        {subtitle && <p className="text-[15px] font-medium text-muted">{subtitle}</p>}
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}
