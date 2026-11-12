import { ChartLine, Dumbbell, House, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type Tab = 'home' | 'library' | 'progress' | 'settings'

const ITEMS: { tab: Tab; label: string; icon: LucideIcon }[] = [
  { tab: 'home', label: 'Главная', icon: House },
  { tab: 'library', label: 'Упражнения', icon: Dumbbell },
  { tab: 'progress', label: 'Прогресс', icon: ChartLine },
  { tab: 'settings', label: 'Настройки', icon: Settings },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav
      aria-label="Основная навигация"
      className="shrink-0 border-t border-border bg-bg"
    >
      <ul className="mx-auto flex max-w-lg px-2 pt-1 pb-[max(env(safe-area-inset-bottom),8px)]">
        {ITEMS.map(({ tab: item, label, icon: Icon }) => {
          const active = item === tab
          return (
            <li key={item} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                  active ? 'text-accent' : 'text-muted',
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
