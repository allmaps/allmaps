import { expect, test } from 'vitest'

import bundledMasks from '../src/lib/hero/masks.json'
import { getMaskGridRowName } from '../src/lib/hero/rows.js'
import {
  getPartnershipGrid,
  isPartnershipCellCovered
} from '../src/lib/hero/partnership.js'

test.each([
  [390, 8, 12, 74],
  [699, 8, 12, 74],
  [700, 12, 8, 73],
  [899, 12, 8, 73],
  [900, 15, 10, 127],
  [1280, 15, 10, 127]
])(
  'partnership geometry at %ipx preserves the layout and clears whole cells',
  (width, columns, rows, visibleCells) => {
    const grid = getPartnershipGrid(width)
    expect(grid.columns).toBe(columns)
    expect(grid.rows).toBe(rows)
    let visible = 0
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (!isPartnershipCellCovered(grid, column, row)) visible++
      }
    }
    expect(visible).toBe(visibleCells)
    expect(
      isPartnershipCellCovered(
        grid,
        grid.title.columnStart - 1,
        grid.title.rowStart - 1
      )
    ).toBe(true)
    expect(
      isPartnershipCellCovered(
        grid,
        grid.title.columnEnd - 1,
        grid.title.rowStart - 1
      )
    ).toBe(false)
    expect(isPartnershipCellCovered(grid, 1, grid.logoRow - 1)).toBe(true)
    expect(isPartnershipCellCovered(grid, 2, grid.logoRow - 1)).toBe(true)
    expect(isPartnershipCellCovered(grid, 3, grid.logoRow - 1)).toBe(false)
    expect(
      bundledMasks.pages['/iiif-partnership'].masks.length
    ).toBeGreaterThanOrEqual(columns * rows)
  }
)

test('all partnership rows have unique names and the first three match compact heroes', () => {
  const names = Array.from({ length: 12 }, (_, row) => getMaskGridRowName(row))
  expect(new Set(names).size).toBe(12)
  expect(names.slice(0, 3)).toEqual([
    'mask-grid-top',
    'mask-grid-middle',
    'mask-grid-bottom'
  ])
})
