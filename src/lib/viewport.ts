interface StandaloneNavigator {
  standalone?: boolean
}

// In the installed iPhone app the layout viewport sometimes stays shorter than
// the screen, or scrolled, after the keyboard closes or the app returns from the
// background, so `inset: 0` screens end above the bottom edge. The installed app
// always covers the whole portrait screen, so its height is pinned to it.
export function pinViewportToScreen(): void {
  const standalone = (navigator as Navigator & StandaloneNavigator).standalone === true
  const root = document.documentElement
  const update = () => {
    if (standalone) root.style.setProperty('--app-height', `${screen.height}px`)
    if (window.scrollY !== 0) window.scrollTo(0, 0)
  }
  update()
  const schedule = () => requestAnimationFrame(update)
  window.visualViewport?.addEventListener('resize', schedule)
  window.addEventListener('focusout', schedule)
  window.addEventListener('pageshow', schedule)
  document.addEventListener('visibilitychange', schedule)
}
