import { describe, expect, it } from 'vitest'
import { EXERCISES } from './exercises'
import { BAND_LEVELS, EXERCISE_IDS, type ExerciseId } from './types'

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

  const PREVIOUS_STEP_IDS: Partial<Record<ExerciseId, string[]>> = {
    'band-squat': ['L1', 'L2', 'L3', 'L2+L3'],
    'push-up': ['incline', 'floor', 'decline', 'band-L1', 'band-L2'],
    'seated-band-row': ['L1', 'L2', 'L3', 'L2+L3'],
    'band-romanian-deadlift': ['L1', 'L2', 'L3', 'L2+L3'],
    'band-overhead-press': ['L1', 'L2'],
    'band-biceps-curl': ['L1', 'L2', 'L3'],
    'bulgarian-split-squat': ['split-squat', 'bulgarian', 'band-L1', 'band-L2', 'band-L3'],
    'bent-over-band-row': ['L1', 'L2', 'L3', 'L2+L3'],
    'banded-glute-bridge': ['L1', 'L2', 'L3', 'single-leg-L2'],
    'band-overhead-triceps-extension': ['L1', 'L2'],
  }

  it.each(Object.entries(PREVIOUS_STEP_IDS))('%s keeps the step ids saved by earlier versions', (id, stepIds) => {
    const current = EXERCISES[id as ExerciseId].loadSteps.map((step) => step.id)
    expect(current).toEqual(expect.arrayContaining(stepIds))
  })

  it.each([
    'band-squat',
    'seated-band-row',
    'band-romanian-deadlift',
    'band-biceps-curl',
    'bent-over-band-row',
    'band-overhead-triceps-extension',
  ] as const)('%s puts band pairs between single bands', (id) => {
    expect(EXERCISES[id].loadSteps.slice(0, 6).map((step) => step.id)).toEqual(['L1', 'L2', 'L1+L2', 'L3', 'L1+L3', 'L2+L3'])
  })

  it('keeps L3 out of the overhead press', () => {
    expect(EXERCISES['band-overhead-press'].loadSteps.map((step) => step.id)).toEqual(['L1', 'L2', 'L1+L2'])
  })

  it.each([
    ['push-up', ['band-L1', 'band-L2', 'band-L1+L2', 'band-L3']],
    ['bulgarian-split-squat', ['band-L1', 'band-L2', 'band-L1+L2', 'band-L3', 'band-L1+L3', 'band-L2+L3']],
    ['banded-glute-bridge', ['L1', 'L2', 'L1+L2', 'L3', 'single-leg-L2', 'L1+L3', 'L2+L3']],
    ['band-overhead-triceps-extension', ['L2+L3', 'one-arm-L3', 'one-arm-L1+L3', 'one-arm-L2+L3']],
  ] as const)('%s ends with its heaviest variants', (id, last) => {
    expect(EXERCISES[id].loadSteps.slice(-last.length).map((step) => step.id)).toEqual(last)
  })

  it.each(EXERCISE_IDS.filter((id) => EXERCISES[id].loadSteps.some((step) => step.bands.length > 1)))(
    '%s explains how to stack two bands',
    (id) => {
      expect(EXERCISES[id].tips.some((tip) => /Две ленты/.test(tip))).toBe(true)
    },
  )

  it('never stacks more than two bands', () => {
    const counts = EXERCISE_IDS.flatMap((id) => EXERCISES[id].loadSteps.map((step) => step.bands.length))
    expect(Math.max(...counts)).toBe(2)
  })
})
