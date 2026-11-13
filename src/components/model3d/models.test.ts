import { describe, expect, it } from 'vitest'
import { EXERCISES } from '@/domain/exercises'
import { clipTime, MODELS, muscleLevels } from './models'

describe('3D models', () => {
  it('maps exercise muscles to one level per group with index 0 for unmarked vertices', () => {
    const levels = muscleLevels(EXERCISES['push-up'].muscles)
    expect(levels).toHaveLength(16)
    expect(levels[0]).toBe(0)
    expect(levels[1]).toBe(2)
    expect(levels[2]).toBe(1)
    expect(levels[3]).toBe(0)
  })

  it('maps the cycle position to time inside the clip', () => {
    const model = MODELS['push-up']!
    expect(clipTime(model, 0)).toBe(0)
    expect(clipTime(model, 1)).toBeCloseTo(0.6)
    expect(clipTime(model, 1.5)).toBeCloseTo(0.6)
  })

  it('has models only for push-ups and banded squats', () => {
    expect(Object.keys(MODELS).sort()).toEqual(['band-squat', 'push-up'])
  })
})
