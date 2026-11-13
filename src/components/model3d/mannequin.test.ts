/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MUSCLE_IDS } from '@/domain/types'
import { MODELS } from './models'

interface GltfJson {
  meshes: { primitives: { attributes: Record<string, number> }[] }[]
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number; max?: number[] }[]
  bufferViews: { byteOffset?: number; byteLength: number }[]
  animations: { name: string; samplers: { input: number }[] }[]
}

function readGlb(path: string) {
  const file = readFileSync(path)
  const jsonLength = file.readUInt32LE(12)
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as GltfJson
  const binStart = 20 + jsonLength + 8
  return { json, bin: file.subarray(binStart) }
}

const { json, bin } = readGlb(new URL('../../../public/models/mannequin.glb', import.meta.url).pathname)

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
