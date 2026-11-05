import { describe, expect, test } from 'vitest'

import {
  getHeroGrid,
  getHeroMaskDelay,
  getHeroTitleArea,
  getTitleOpening,
  heroGap,
  heroLeadingColumns,
  isCellInOpening
} from '../src/lib/hero/grid.js'

describe('shifted hero grid', () => {
  test.each([320, 390, 639, 640, 1280, 1600, 2400])(
    'covers the capped field with fixed square tiles at width %i',
    (width) => {
      const grid = getHeroGrid(width)
      expect(grid.rows).toBe(3)
      expect(grid.tileSize).toBe(width < 640 ? 52 : 80)
      expect(grid.origin).toBeLessThanOrEqual(0)
      expect(
        grid.origin +
          (grid.columns - 1) * (grid.tileSize + heroGap) +
          grid.tileSize
      ).toBeGreaterThanOrEqual(Math.min(width, 1600))
      expect(grid.height).toBe(width < 640 ? 204 : 288)
    }
  )

  test('height stays stable while the grid shifts with the content', () => {
    expect(getHeroGrid(320).height).toBe(getHeroGrid(639).height)
    expect(getHeroGrid(640).height).toBe(getHeroGrid(2400).height)
    expect(getHeroGrid(1280).origin).not.toBe(getHeroGrid(1600).origin)
    expect(getHeroGrid(2400)).toEqual(getHeroGrid(1600))
  })

  test('can use the measured content inset for a different root font size', () => {
    const grid = getHeroGrid(1280, 200)
    expect(grid.origin + heroLeadingColumns * (grid.tileSize + heroGap)).toBe(
      184
    )
  })
})

describe('content-aligned title', () => {
  test.each([320, 390, 639, 640, 1280, 1600, 2400])(
    'clears whole tiles in the middle row with consistent padding at width %i',
    (width) => {
      const grid = getHeroGrid(width)
      const area = getHeroTitleArea(width)
      const fontSize = Math.min(58, Math.max(32, width * 0.04))
      // Geograph width of the longest remaining heading: Plugins & libraries.
      const titleWidth = (273.9 * fontSize) / 32
      const titleHeight = fontSize * 1.1
      const top = (grid.height - titleHeight) / 2
      const opening = getTitleOpening(grid, {
        left: area.left,
        right: area.left + titleWidth,
        top,
        bottom: top + titleHeight
      })
      expect(titleWidth).toBeLessThanOrEqual(area.width)
      expect(opening?.rowStart).toBe(1)
      expect(opening?.rowEnd).toBe(2)
      expect(opening?.columnStart).toBe(heroLeadingColumns)
      expect(
        area.left -
          (grid.origin + opening!.columnStart * (grid.tileSize + heroGap))
      ).toBeCloseTo(16)
      expect(area.left).toBe(
        (Math.min(width, 1600) - Math.min(Math.min(width, 1600) - 32, 704)) / 2
      )
    }
  )
})

describe('title opening', () => {
  const grid = { columns: 10, rows: 3, tileSize: 80, height: 288, origin: 16 }

  test('clears partial-cell overlaps and breathing room', () => {
    expect(
      getTitleOpening(grid, { left: 110, right: 210, top: 115, bottom: 155 })
    ).toEqual({ columnStart: 0, columnEnd: 3, rowStart: 1, rowEnd: 2 })
  })

  test('does not clear neighboring cells when title edges fall in gaps', () => {
    expect(
      getTitleOpening(grid, { left: 100, right: 188, top: 100, bottom: 188 }, 0)
    ).toEqual({ columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 })
  })

  test('does not clear a preceding tile because of subpixel rounding', () => {
    const mobileGrid = getHeroGrid(320)
    expect(
      getTitleOpening(mobileGrid, {
        left: 16 - 1 / 128,
        right: 200,
        top: 90,
        bottom: 114
      })?.columnStart
    ).toBe(heroLeadingColumns)
  })

  test('clamps the opening to the rendered tiles', () => {
    expect(
      getTitleOpening(grid, {
        left: -100,
        right: 2000,
        top: -100,
        bottom: 2000
      })
    ).toEqual({ columnStart: 0, columnEnd: 10, rowStart: 0, rowEnd: 3 })
  })

  test('uses exclusive rectangle boundaries', () => {
    const opening = { columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 }
    expect(isCellInOpening(1, 1, opening)).toBe(true)
    expect(isCellInOpening(3, 1, opening)).toBe(false)
    expect(isCellInOpening(1, 2, opening)).toBe(false)
    expect(isCellInOpening(1, 1)).toBe(false)
  })

  test('a title outside the field does not clear tiles', () => {
    expect(
      getTitleOpening(grid, { left: -100, right: -50, top: 10, bottom: 40 })
    ).toBeUndefined()
  })
})

describe('first-load mask fade', () => {
  test('has deterministic, varied delays within the partnership fade window', () => {
    const delays = Array.from({ length: 90 }, (_, index) =>
      getHeroMaskDelay(index)
    )
    expect(new Set(delays).size).toBe(90)
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...delays)).toBeLessThan(3000)
    expect(getHeroMaskDelay(45)).toBe(delays[45])
  })
})
