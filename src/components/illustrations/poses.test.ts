import { describe, expect, it } from 'vitest'
import { EXERCISE_IDS } from '@/domain/types'
import { FRAMES } from './poses'

describe('illustrations', () => {
  it.each(EXERCISE_IDS)('%s has start and end frames', (id) => {
    expect(FRAMES[id].start.near.length).toBeGreaterThan(0)
    expect(FRAMES[id].end.near.length).toBeGreaterThan(0)
  })
})
