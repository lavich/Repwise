import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './button'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Depends on `open` only: callers pass a new onClose on every render, and
  // re-running this effect would steal focus from inputs inside the sheet.
  useEffect(() => {
    if (!open) return
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      returnFocus?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="app-screen z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pb-safe relative flex outline-none max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] border border-border bg-surface"
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          <Button variant="secondary" size="icon" className="size-11 rounded-full" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
