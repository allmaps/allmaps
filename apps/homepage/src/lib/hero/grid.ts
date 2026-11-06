export const heroPadding = 16
export const heroGap = 8
export const heroLeadingColumns = 10
export const heroColumns = 30
export const heroLayoutEvent = 'allmaps:measure-mask-grid-hero'

export type HeroGrid = {
  columns: number
  rows: number
  tileSize: number
  height: number
  origin: number
}

export type Rectangle = {
  left: number
  top: number
  right: number
  bottom: number
}

export type GridOpening = {
  columnStart: number
  columnEnd: number
  rowStart: number
  rowEnd: number
}

export function getHeroTitleArea(width: number) {
  const fieldWidth = Math.min(width, 1600)
  const contentWidth = Math.min(fieldWidth - heroPadding * 2, 704)
  return { left: (fieldWidth - contentWidth) / 2, width: contentWidth }
}

export function getHeroGrid(
  width: number,
  titleLeft = getHeroTitleArea(width).left
): HeroGrid {
  const tileSize = width < 640 ? 52 : 80
  const rows = 3
  return {
    columns: heroColumns,
    rows,
    tileSize,
    height: tileSize * rows + heroGap * (rows - 1) + heroPadding * 2,
    origin: titleLeft - heroPadding - heroLeadingColumns * (tileSize + heroGap)
  }
}

export function getHeroMaskDelay(index: number) {
  return (index * 977) % 3000
}

// Test actual cell intersections so an edge in a gap does not clear extra cells.
export function getTitleOpening(
  grid: HeroGrid,
  title: Rectangle,
  breathingRoom = 16
): GridOpening | undefined {
  const columns: number[] = []
  const rows: number[] = []
  const pitch = grid.tileSize + heroGap
  // Browser layout rounds coordinates to fractions of a CSS pixel.
  const tolerance = 1 / 32

  for (let column = 0; column < grid.columns; column++) {
    const left = grid.origin + column * pitch
    if (
      left < title.right + breathingRoom - tolerance &&
      left + grid.tileSize > title.left - breathingRoom + tolerance
    ) {
      columns.push(column)
    }
  }

  for (let row = 0; row < grid.rows; row++) {
    const top = heroPadding + row * pitch
    if (
      top < title.bottom + breathingRoom - tolerance &&
      top + grid.tileSize > title.top - breathingRoom + tolerance
    ) {
      rows.push(row)
    }
  }

  if (!columns.length || !rows.length) return

  return {
    columnStart: columns[0],
    columnEnd: columns[columns.length - 1] + 1,
    rowStart: rows[0],
    rowEnd: rows[rows.length - 1] + 1
  }
}

export function isCellInOpening(
  column: number,
  row: number,
  opening?: GridOpening
) {
  return Boolean(
    opening &&
    column >= opening.columnStart &&
    column < opening.columnEnd &&
    row >= opening.rowStart &&
    row < opening.rowEnd
  )
}
