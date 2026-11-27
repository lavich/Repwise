type Phase = 'to-end' | 'hold-end' | 'to-start' | 'hold-start'

export interface CycleState {
  t: number
  phase: Phase
}

export const TEMPO = { toEnd: 1500, holdEnd: 400, toStart: 1500, holdStart: 600 }
const easeInOutSine = (x: number) => (1 - Math.cos(Math.PI * x)) / 2

export function cycleAt(elapsedMs: number): CycleState {
  const tempo = TEMPO
  const length = tempo.toEnd + tempo.holdEnd + tempo.toStart + tempo.holdStart
  let s = elapsedMs % length
  if (s < tempo.toEnd) return { t: easeInOutSine(s / tempo.toEnd), phase: 'to-end' }
  s -= tempo.toEnd
  if (s < tempo.holdEnd) return { t: 1, phase: 'hold-end' }
  s -= tempo.holdEnd
  if (s < tempo.toStart) return { t: 1 - easeInOutSine(s / tempo.toStart), phase: 'to-start' }
  return { t: 0, phase: 'hold-start' }
}
