import { useEffect, useState } from 'react'

export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])
  return now
}

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) void sentinel.release()
      } catch {
        // Wake lock is best effort: it is refused in low power mode.
      }
    }
    const onVisibility = () => document.visibilityState === 'visible' && void request()
    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
    }
  }, [enabled])
}
