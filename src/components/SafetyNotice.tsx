const SAFETY_RULES = [
  'Техника важнее числа повторов: считайте только повторы с хорошей техникой.',
  'Остановитесь сразу при боли. Через боль не тренируемся.',
  'Перед тренировкой проверяйте ленты на надрывы и потёртости.',
  'Надёжно фиксируйте ленту под серединой стопы и держите её подальше от лица.',
  'Подходы заканчивайте за 1–2 повтора до отказа — так растут мышцы без лишнего риска.',
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
