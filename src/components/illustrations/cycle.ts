export interface Tempo {
  toEnd: number
  holdEnd: number
  toStart: number
  holdStart: number
}

export type Phase = 'to-end' | 'hold-end' | 'to-start' | 'hold-start'

export interface CycleState {
  t: number
  phase: Phase
  finished: boolean
}

export const DEFAULT_TEMPO: Tempo = { toEnd: 1500, holdEnd: 400, toStart: 1500, holdStart: 600 }
export const MAX_CYCLES = 5

const easeInOutSine = (x: number) => (1 - Math.cos(Math.PI * x)) / 2

export function cycleAt(elapsedMs: number, tempo: Tempo = DEFAULT_TEMPO, maxCycles = MAX_CYCLES): CycleState {
  const length = tempo.toEnd + tempo.holdEnd + tempo.toStart + tempo.holdStart
  if (elapsedMs >= length * maxCycles) return { t: 0, phase: 'hold-start', finished: true }
  let s = elapsedMs % length
  if (s < tempo.toEnd) return { t: easeInOutSine(s / tempo.toEnd), phase: 'to-end', finished: false }
  s -= tempo.toEnd
  if (s < tempo.holdEnd) return { t: 1, phase: 'hold-end', finished: false }
  s -= tempo.holdEnd
  if (s < tempo.toStart) return { t: 1 - easeInOutSine(s / tempo.toStart), phase: 'to-start', finished: false }
  return { t: 0, phase: 'hold-start', finished: false }
}
