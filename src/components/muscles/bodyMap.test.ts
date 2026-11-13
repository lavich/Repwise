/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MUSCLE_IDS } from '@/domain/types'
import { MUSCLE_REGIONS } from './bodyMap'

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

function themeTokens(css: string, selector: string): Record<string, string> {
  const block = css.slice(css.indexOf(selector))
  const body = block.slice(block.indexOf('{') + 1, block.indexOf('}'))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]))
}

describe('body map', () => {
  it.each(MUSCLE_IDS)('draws %s', (id) => {
    expect(MUSCLE_REGIONS.some((region) => region.muscle === id)).toBe(true)
  })
})

describe('muscle colours', () => {
  const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
  it.each([
    ['dark', ":root[data-theme='dark']"],
    ['light', ":root[data-theme='light']"],
  ])('keep the load steps distinguishable in the %s theme', (_, selector) => {
    const t = themeTokens(css, selector)
    expect(contrast(t['muscle-1']!, t['muscle-0']!)).toBeGreaterThanOrEqual(3)
    expect(contrast(t['muscle-2']!, t['muscle-1']!)).toBeGreaterThanOrEqual(1.5)
    expect(contrast(t['muscle-3']!, t['muscle-2']!)).toBeGreaterThanOrEqual(1.5)
  })
})
