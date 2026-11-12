import type { ReactNode } from 'react'

export function BottomActions({ children }: { children: ReactNode }) {
  return (
    <div className="pb-safe sticky bottom-0 z-20 -mx-4 mt-auto border-t border-border bg-bg/90 px-4 pt-3 backdrop-blur-xl">
      <div className="space-y-2">{children}</div>
    </div>
  )
}
