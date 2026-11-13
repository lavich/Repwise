/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MUSCLE_IDS } from '@/domain/types'
import { MODELS } from './models'

interface GltfJson {
  meshes: { primitives: { attributes: Record<string, number> }[] }[]
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number; type: string; max?: number[] }[]
  bufferViews: { byteOffset?: number; byteLength: number }[]
  nodes: { name?: string }[]
  animations: {
    name: string
    samplers: { input: number; output: number }[]
    channels: { sampler: number; target: { node: number; path: string } }[]
  }[]
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC3: 3, VEC4: 4 }

function readGlb(path: string) {
  const file = readFileSync(path)
  const jsonLength = file.readUInt32LE(12)
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as GltfJson
  const binStart = 20 + jsonLength + 8
  return { json, bin: file.subarray(binStart) }
}

const { json, bin } = readGlb(new URL('../../../public/models/mannequin.glb', import.meta.url).pathname)

function readAccessor(index: number): number[][] {
  const accessor = json.accessors[index]!
  const view = json.bufferViews[accessor.bufferView]!
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const size = COMPONENTS[accessor.type]!
  return Array.from({ length: accessor.count }, (_, i) =>
    Array.from({ length: size }, (__, k) => bin.readFloatLE(offset + (i * size + k) * 4)),
  )
}

function clipDuration(name: string): number {
  const animation = json.animations.find((a) => a.name === name)
  if (!animation) return 0
  return Math.max(...animation.samplers.map((s) => json.accessors[s.input]?.max?.[0] ?? 0))
}

describe('mannequin model', () => {
  it('contains every clip used by the app, long enough for its transition', () => {
    for (const model of Object.values(MODELS)) {
      expect(clipDuration(model.clip)).toBeGreaterThanOrEqual(model.duration - 1e-3)
    }
  })

  it('reaches the bottom of the push-up at the end of the transition', () => {
    const animation = json.animations.find((a) => a.name === MODELS['push-up']!.clip)!
    const channel = animation.channels.find(
      (c) => json.nodes[c.target.node]?.name === 'pelvis' && c.target.path === 'translation',
    )!
    const sampler = animation.samplers[channel.sampler]!
    const times = readAccessor(sampler.input).map(([t]) => t!)
    const positions = readAccessor(sampler.output)
    const ranges = [0, 1, 2].map((axis) => {
      const values = positions.map((p) => p[axis]!)
      return Math.max(...values) - Math.min(...values)
    })
    const axis = ranges.indexOf(Math.max(...ranges))
    const heights = positions.map((p) => p[axis]!)
    const bottom = times[heights.indexOf(Math.min(...heights))]!
    expect(Math.abs(bottom - MODELS['push-up']!.duration)).toBeLessThanOrEqual(1 / 30 + 1e-6)
  })

  it('marks muscles symmetrically on the left and right side', () => {
    const attributes = json.meshes[0]!.primitives[0]!.attributes
    const muscles = readAccessor(attributes._MUSCLE!).map(([v]) => Math.round(v!))
    const positions = readAccessor(attributes.POSITION!)
    const left = new Array<number>(MUSCLE_IDS.length + 1).fill(0)
    const right = new Array<number>(MUSCLE_IDS.length + 1).fill(0)
    muscles.forEach((muscle, i) => {
      const x = positions[i]![0]!
      if (x > 0.001) left[muscle]! += 1
      else if (x < -0.001) right[muscle]! += 1
    })
    expect(left.slice(1)).toEqual(right.slice(1))
  })

  it('marks muscles on vertices with values 0..15 and covers every group', () => {
    const accessorIndex = json.meshes[0]?.primitives[0]?.attributes._MUSCLE
    expect(accessorIndex).toBeDefined()
    const accessor = json.accessors[accessorIndex!]!
    expect(accessor.componentType).toBe(5126)
    const view = json.bufferViews[accessor.bufferView]!
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    const counts = new Array<number>(MUSCLE_IDS.length + 1).fill(0)
    for (let i = 0; i < accessor.count; i++) {
      const value = Math.round(bin.readFloatLE(offset + i * 4))
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(MUSCLE_IDS.length)
      counts[value]! += 1
    }
    counts.slice(1).forEach((count) => expect(count).toBeGreaterThanOrEqual(20))
  })
})
