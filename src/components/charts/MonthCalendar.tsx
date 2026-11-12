import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { localDayKey } from '@/domain/stats'
import type { SessionStatus } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatMonth } from '@/lib/format'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function MonthCalendar({ days }: { days: Map<string, SessionStatus> }) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const offset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const [today] = useState(() => localDayKey(new Date()))
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) =>
    i < offset ? null : new Date(month.getFullYear(), month.getMonth(), i - offset + 1),
  )
  const shift = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={() => shift(-1)} aria-label="Предыдущий месяц">
          <ChevronLeft className="size-5" />
        </Button>
        <p className="font-semibold">{formatMonth(month)}</p>
        <Button variant="ghost" size="icon" className="size-11 rounded-full" onClick={() => shift(1)} aria-label="Следующий месяц">
          <ChevronRight className="size-5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <p key={d} className="pb-1 text-xs font-semibold text-muted">
            {d}
          </p>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />
          const key = localDayKey(date)
          const status = days.get(key)
          return (
            <span
              key={key}
              aria-label={`${date.getDate()}${status === 'completed' ? ', тренировка' : status === 'stopped' ? ', тренировка остановлена' : ''}`}
              className={cn(
                'tabular mx-auto flex size-10 items-center justify-center rounded-full text-[15px]',
                status === 'completed' && 'bg-accent font-bold text-accent-fg',
                status === 'stopped' && 'border-2 border-warning font-semibold',
                !status && key === today && 'border border-border-strong',
              )}
            >
              {date.getDate()}
            </span>
          )
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-accent" /> выполнена
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-warning" /> остановлена
        </span>
      </div>
    </div>
  )
}
