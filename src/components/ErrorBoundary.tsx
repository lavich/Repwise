import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { discardActive } from '@/state/actions'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="pt-safe pb-safe app-screen mx-auto flex max-w-lg flex-col justify-center gap-4 overflow-y-auto px-4 text-center">
        <h1 className="text-2xl font-bold">Что-то пошло не так</h1>
        <p className="text-[15px] text-muted">История тренировок сохранена. Если ошибка повторяется, сбросьте текущую тренировку.</p>
        <Button size="lg" onClick={() => this.setState({ failed: false })}>
          Попробовать снова
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={() => {
            discardActive()
            this.setState({ failed: false })
          }}
        >
          Сбросить текущую тренировку
        </Button>
      </div>
    )
  }
}
