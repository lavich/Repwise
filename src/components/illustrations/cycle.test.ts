import { describe, expect, it } from 'vitest'
import { cycleAt, TEMPO, MAX_CYCLES } from './cycle'

describe('animation cycle', () => {
  const cycle = TEMPO.toEnd + TEMPO.holdEnd + TEMPO.toStart + TEMPO.holdStart

  it('moves to the end, holds, returns and repeats', () => {
    expect(cycleAt(0)).toMatchObject({ t: 0, phase: 'to-end' })
    expect(cycleAt(TEMPO.toEnd / 2).t).toBeCloseTo(0.5)
    expect(cycleAt(TEMPO.toEnd + 10)).toMatchObject({ t: 1, phase: 'hold-end' })
    expect(cycleAt(cycle - 10)).toMatchObject({ t: 0, phase: 'hold-start' })
    expect(cycleAt(cycle + TEMPO.toEnd / 2).t).toBeCloseTo(0.5)
  })

  it('stops on the start position after the last cycle', () => {
    expect(cycleAt(cycle * MAX_CYCLES)).toEqual({ t: 0, phase: 'hold-start', finished: true })
  })
})
