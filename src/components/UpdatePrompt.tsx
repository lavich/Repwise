import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// A new version reloads the page, so it is applied only outside a workout to
// keep unsaved input (reps, feedback form) intact.
export function UpdatePrompt({ canUpdate }: { canUpdate: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  useEffect(() => {
    if (needRefresh && canUpdate) void updateServiceWorker(true)
  }, [needRefresh, canUpdate, updateServiceWorker])

  return null
}
