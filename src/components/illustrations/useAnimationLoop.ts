import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import type { Tempo } from './poses'
import { cycleAt, DEFAULT_TEMPO, type CycleState } from './rig'

export type PlayState = 'playing' | 'paused' | 'finished'

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function subscribeReducedMotion(onChange: () => void) {
  reducedMotionQuery.addEventListener('change', onChange)
  return () => reducedMotionQuery.removeEventListener('change', onChange)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => reducedMotionQuery.matches)
}

// Drives a looping exercise animation: frames only run while the element is
// on screen and the page is visible, and played time survives pauses.
export function useAnimationLoop(
  container: RefObject<HTMLElement | null>,
  onFrame: (state: CycleState) => void,
  tempo: Tempo = DEFAULT_TEMPO,
  enabled = true,
) {
  const [playState, setPlayState] = useState<PlayState>('playing')
  const elapsed = useRef(0)
  const frameHandler = useRef(onFrame)

  useEffect(() => {
    frameHandler.current = onFrame
  })

  useEffect(() => {
    if (!enabled || playState !== 'playing') return
    const element = container.current
    if (!element) return
    let frame = 0
    let last: number | null = null
    let onScreen = true

    const tick = (now: number) => {
      if (last !== null) elapsed.current += now - last
      last = now
      const state = cycleAt(elapsed.current, tempo)
      frameHandler.current(state)
      if (state.finished) {
        elapsed.current = 0
        setPlayState('finished')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    const run = () => {
      cancelAnimationFrame(frame)
      last = null
      if (onScreen && document.visibilityState === 'visible') frame = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true
      run()
    })
    observer.observe(element)
    document.addEventListener('visibilitychange', run)
    run()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', run)
    }
  }, [enabled, playState, container, tempo])

  return { playState, setPlayState }
}
