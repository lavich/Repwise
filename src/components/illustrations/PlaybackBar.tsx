import { Pause, Play, RotateCcw } from 'lucide-react'
import type { Ref } from 'react'
import type { PlayState } from './useAnimationLoop'

const CONTROLS = {
  playing: { label: 'Пауза', icon: Pause, next: 'paused' },
  paused: { label: 'Запустить', icon: Play, next: 'playing' },
  finished: { label: 'Повторить', icon: RotateCcw, next: 'playing' },
} as const

export function PlaybackBar({
  playState,
  onChange,
  caption,
  captionRef,
}: {
  playState: PlayState | null
  onChange: (state: PlayState) => void
  caption: string
  captionRef?: Ref<HTMLSpanElement>
}) {
  const control = playState ? CONTROLS[playState] : null
  const Icon = control?.icon
  return (
    <div className="mt-1 flex min-h-11 items-center justify-between gap-2">
      <span ref={captionRef} className="pl-1 text-[13px] font-medium text-muted" aria-hidden="true">
        {caption}
      </span>
      {control && Icon && (
        <button
          type="button"
          onClick={() => onChange(control.next)}
          className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted active:bg-surface"
        >
          <Icon className="size-4" />
          {control.label}
        </button>
      )}
    </div>
  )
}
