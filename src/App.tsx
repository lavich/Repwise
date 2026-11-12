import { useEffect, useRef, useState } from 'react'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAppData, useSaveFailed } from '@/state/store'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { ProgressScreen } from '@/screens/ProgressScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SummaryScreen } from '@/screens/SummaryScreen'
import { WorkoutScreen } from '@/screens/workout/WorkoutScreen'

const THEME_COLORS = { dark: '#0b0d0c', light: '#f3f4f1' } as const

export function App() {
  const data = useAppData()
  const [tab, setTab] = useState<Tab>('home')
  const [progressView, setProgressView] = useState<'overview' | 'history'>('overview')
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null)
  const theme = data.settings.theme
  const inWorkout = data.activeWorkout !== null
  const saveFailed = useSaveFailed()
  const scrollRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
    scrollRef.current?.scrollTo(0, 0)
  }, [tab, summarySessionId, inWorkout])

  let screen
  if (data.activeWorkout) {
    screen = <WorkoutScreen active={data.activeWorkout} onFinished={setSummarySessionId} />
  } else if (summarySessionId) {
    screen = (
      <SummaryScreen
        sessionId={summarySessionId}
        onClose={() => {
          setSummarySessionId(null)
          setTab('home')
        }}
      />
    )
  } else {
    screen = (
      <div className="flex h-dvh flex-col">
        <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="pt-safe mx-auto max-w-lg px-4 pb-8">
            {tab === 'home' && (
              <DashboardScreen
                onOpenHistory={() => {
                  setProgressView('history')
                  setTab('progress')
                }}
              />
            )}
            {tab === 'library' && <LibraryScreen />}
            {tab === 'progress' && <ProgressScreen view={progressView} onViewChange={setProgressView} />}
            {tab === 'settings' && <SettingsScreen />}
          </div>
        </main>
        <BottomNav tab={tab} onChange={setTab} />
      </div>
    )
  }

  return (
    <>
      <UpdatePrompt canUpdate={!inWorkout} />
      {saveFailed && (
        <p role="alert" className="pt-safe fixed inset-x-0 top-0 z-[60] bg-danger px-4 pb-2 text-center text-[15px] font-semibold text-bg">
          Не удалось сохранить данные на устройстве. Сделайте экспорт в настройках.
        </p>
      )}
      <ErrorBoundary>{screen}</ErrorBoundary>
    </>
  )
}
