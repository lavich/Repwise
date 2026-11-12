import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BottomActionsSlot } from './bottomActionsSlot'

export function BottomActions({ children }: { children: ReactNode }) {
  const slot = useContext(BottomActionsSlot)
  if (!slot) return null
  return createPortal(
    <div className="pb-safe border-t border-border bg-bg pt-3">
      <div className="mx-auto max-w-lg space-y-2 px-4">{children}</div>
    </div>,
    slot,
  )
}
