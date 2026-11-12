import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

export function ScopeNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl bg-warning-soft p-4 text-[15px] leading-snug', className)}>
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
      <p>
        <span className="font-semibold">Только ноги и кор.</span> Упражнения на верхнюю часть тела — отжимания, планки
        на руках, жимы и тяги — в этот вводный блок не входят.
      </p>
    </div>
  )
}

const SAFETY_RULES = [
  'Остановитесь сразу при боли, головокружении или тошноте. Через симптомы не тренируемся.',
  'Без резких поворотов и наклонов головы. Смотрите на неподвижную точку перед собой.',
  'Ложитесь и вставайте с пола медленно, через бок. После упражнений лёжа полежите 20–30 секунд.',
  'Держите рядом устойчивую опору — спинку стула или стол — для упражнений стоя.',
  'Не опирайтесь на руки и плечи: программа их не нагружает.',
  'Ленту меняйте только когда текущая стала комфортной. L3 не используется без отдельного решения.',
]

export function SafetyRules() {
  return (
    <ul className="space-y-3">
      {SAFETY_RULES.map((rule) => (
        <li key={rule} className="flex gap-3 text-[15px] leading-snug">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
          {rule}
        </li>
      ))}
    </ul>
  )
}
