import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

import bundledMasks from '../src/lib/hero/masks.json'

describe('bundled page masks', () => {
  test('every hero page has a distinct collection of real outlines', () => {
    const pageNames = readdirSync(
      new URL('../src/routes/(content)/', import.meta.url),
      { withFileTypes: true }
    )
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(
            new URL(
              `../src/routes/(content)/${entry.name}/+page.svx`,
              import.meta.url
            )
          )
      )
      .map((entry) => `/${entry.name}`)
    expect(Object.keys(bundledMasks.pages).sort()).toEqual(
      [...pageNames, '/iiif-partnership'].sort()
    )

    const seenIds = new Set<string>()
    for (const collection of Object.values(bundledMasks.pages)) {
      expect(
        new URL(collection.source).searchParams.has('modifiedBefore')
      ).toBe(true)
      expect(collection.masks.length).toBeGreaterThanOrEqual(54)
      for (const mask of collection.masks) {
        expect(mask.id).toMatch(/^https:\/\/annotations.allmaps.org\/maps\//)
        expect(mask.path).toMatch(/^M/)
        expect(mask.path).not.toContain('NaN')
        expect(seenIds.has(mask.id)).toBe(false)
        seenIds.add(mask.id)
      }
    }
  })
})

test('content heroes use single palettes and short headings', () => {
  const palettes = [
    'blue',
    'darkblue',
    'purple',
    'orange',
    'red',
    'pink',
    'green',
    'yellow'
  ]
  for (const pathname of Object.keys(bundledMasks.pages)) {
    if (pathname === '/iiif-partnership') continue
    const source = readFileSync(
      new URL(`../src/routes/(content)${pathname}/+page.svx`, import.meta.url),
      'utf8'
    )
    const hero = source.match(/^hero:\n(?: {2}[^\n]*\n)+/m)?.[0]
    expect(hero).toBeDefined()
    const palette = hero?.match(/ {2}palette: ([^\n]+)/)?.[1] ?? 'blue'
    expect(palettes).toContain(palette)
    if (pathname === '/faq') expect(hero).toContain('  title: FAQ\n')
    if (pathname === '/get-started')
      expect(hero).toContain('  title: Get Started\n')
  }
})
