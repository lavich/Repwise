import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { BAND_LEVELS, EXERCISE_IDS } from './types'

describe('exercise catalog', () => {
  it.each(EXERCISE_IDS)('%s has a consistent load ladder', (id) => {
    const exercise = EXERCISES[id]
    const stepIds = exercise.loadSteps.map((step) => step.id)
    expect(new Set(stepIds).size).toBe(stepIds.length)
    expect(stepIds).toContain(exercise.defaultStepId)
    expect(exercise.loadSteps.flatMap((step) => step.bands).every((b) => BAND_LEVELS.includes(b))).toBe(true)
    expect(exercise.repRange.min).toBeLessThan(exercise.repRange.max)
  })

  it.each(EXERCISE_IDS.filter((id) => EXERCISES[id].loadSteps.some((step) => step.bands.length > 0)))(
    '%s explains how to set up the band',
    (id) => {
      expect(EXERCISES[id].startingPosition).toMatch(/лент/i)
    },
  )
})
