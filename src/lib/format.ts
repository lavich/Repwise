import type { BandLevel, Equipment, ProgressionDecisionKind, SkipReason } from '@/domain/types'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  pain: 'Боль или дискомфорт',
  dizziness: 'Головокружение или тошнота',
  balance: 'Неустойчивое равновесие',
  fatigue: 'Сильная усталость',
  other: 'Другая причина',
}

export const DECISION_LABELS: Record<ProgressionDecisionKind, string> = {
  progress: 'Можно прибавить',
  'increase-band': 'Можно сменить ленту',
  repeat: 'Повторить',
  reduce: 'Снизить нагрузку',
  'safety-hold': 'Без повышения',
  'use-alternative': 'Замена упражнения',
  'on-plan': 'По плану',
}

export const BAND_RANGES: Record<BandLevel, string> = {
  L1: '5–15 кг',
  L2: '15–35 кг',
  L3: '25–65 кг',
}

export function formatPrescription(sets: number, reps: number): string {
  return `${sets} × ${reps}`
}

export function bandLabel(band: BandLevel | null): string {
  return band ? `Лента ${band}` : 'Без ленты'
}

export function equipmentLabel(equipment: Equipment, band: BandLevel | null = null): string {
  if (equipment.kind === 'bodyweight') return 'Собственный вес'
  return `Лента ${band ?? equipment.band}, ${equipment.placement}`
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const shortFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

export const formatDay = (iso: string) => dayFormatter.format(new Date(iso))
export const formatShortDay = (iso: string) => shortFormatter.format(new Date(iso)).replace('.', '')
export const formatWeekday = (iso: string) => weekdayFormatter.format(new Date(iso))
export const formatMonth = (date: Date) => {
  const text = monthFormatter.format(date).replace(' г.', '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso))

export function formatDuration(startIso: string, endIso: string | undefined): string {
  if (!endIso) return '—'
  const minutes = Math.max(1, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000))
  return `${minutes} мин`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
