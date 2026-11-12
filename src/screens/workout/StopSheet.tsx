import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'

export function StopSheet({ open, onClose, onStop }: { open: boolean; onClose: () => void; onStop: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Остановить тренировку?">
      <p className="text-base leading-snug">
        При боли — остановитесь сразу. Через боль не тренируемся.
      </p>
      <p className="mt-3 text-[15px] text-muted">Выполненные подходы сохранятся в истории.</p>
      <div className="mt-5 grid gap-2">
        <Button variant="danger" size="lg" onClick={onStop}>
          Остановить сейчас
        </Button>
        <Button variant="secondary" size="lg" onClick={onClose}>
          Продолжить тренировку
        </Button>
      </div>
    </Sheet>
  )
}
