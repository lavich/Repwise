import { describe, expect, it } from 'vitest'
import { EXERCISE_IDS } from '@/domain/types'
import { FRAMES, type Point } from './poses'
import { buildRig, cycleAt, DEFAULT_TEMPO, interpolatePose, MAX_CYCLES } from './rig'

const length = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe.each(EXERCISE_IDS)('%s', (id) => {
  const frames = FRAMES[id]
  const rig = buildRig(frames)

  it('has matching structure in both frames', () => {
    const shape = (pose: typeof frames.start) => ({
      limbs: pose.limbs.map((l) => [l.kind, l.points.length, l.far === true]),
      bands: (pose.bands ?? []).map((b) => b.length),
      props: pose.props ?? [],
      towel: pose.towel !== undefined,
    })
    expect(shape(frames.end)).toEqual(shape(frames.start))
    for (const limb of frames.start.limbs) {
      if (limb.kind === 'leg') expect(limb.points.length).toBeGreaterThanOrEqual(3)
      if (limb.kind === 'leg') expect(limb.points.length).toBeLessThanOrEqual(4)
      if (limb.kind === 'arm') expect(limb.points.length).toBe(3)
    }
  })

  it.each([
    ['start', 0],
    ['end', 1],
  ] as const)('reproduces the %s frame', (key, t) => {
    const pose = interpolatePose(rig, frames, t)
    pose.limbs.forEach((limb, i) =>
      limb.points.forEach((point, j) => {
        const expected = frames[key].limbs[i]!.points[j]!
        expect(length(point, expected)).toBeLessThan(1)
      }),
    )
    expect(length(pose.head, frames[key].head)).toBeLessThan(1)
  })

  it('keeps points that rest on the floor in both frames on the floor', () => {
    const FLOOR = 126
    frames.start.limbs.forEach((limb, i) =>
      limb.points.forEach((point, j) => {
        const endPoint = frames.end.limbs[i]!.points[j]!
        if (point[1] !== FLOOR || endPoint[1] !== FLOOR) return
        for (let k = 1; k < 10; k++) {
          const current = interpolatePose(rig, frames, k / 10).limbs[i]!.points[j]!
          expect(Math.abs(current[1] - FLOOR)).toBeLessThan(1)
        }
      }),
    )
  })

  it('keeps limb lengths during the motion', () => {
    for (const t of [0.25, 0.5, 0.75]) {
      const pose = interpolatePose(rig, frames, t)
      pose.limbs.forEach((limb, i) => {
        for (let j = 1; j < limb.points.length; j++) {
          const startLength = length(frames.start.limbs[i]!.points[j - 1]!, frames.start.limbs[i]!.points[j]!)
          const endLength = length(frames.end.limbs[i]!.points[j - 1]!, frames.end.limbs[i]!.points[j]!)
          const current = length(limb.points[j - 1]!, limb.points[j]!)
          expect(current).toBeGreaterThanOrEqual(Math.min(startLength, endLength) * 0.9)
          expect(current).toBeLessThanOrEqual(Math.max(startLength, endLength) * 1.1)
        }
      })
    }
  })
})

describe('animation cycle', () => {
  const cycle = DEFAULT_TEMPO.toEnd + DEFAULT_TEMPO.holdEnd + DEFAULT_TEMPO.toStart + DEFAULT_TEMPO.holdStart

  it('moves to the end, holds, returns and repeats', () => {
    expect(cycleAt(0)).toMatchObject({ t: 0, phase: 'to-end' })
    expect(cycleAt(DEFAULT_TEMPO.toEnd / 2).t).toBeCloseTo(0.5)
    expect(cycleAt(DEFAULT_TEMPO.toEnd + 10)).toMatchObject({ t: 1, phase: 'hold-end' })
    expect(cycleAt(cycle - 10)).toMatchObject({ t: 0, phase: 'hold-start' })
    expect(cycleAt(cycle + DEFAULT_TEMPO.toEnd / 2).t).toBeCloseTo(0.5)
  })

  it('stops on the start position after the last cycle', () => {
    expect(cycleAt(cycle * MAX_CYCLES)).toEqual({ t: 0, phase: 'hold-start', finished: true })
  })
})
