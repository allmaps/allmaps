type GridArea = {
  columnStart: number
  columnEnd: number
  rowStart: number
  rowEnd: number
}

export function getPartnershipGrid(width: number) {
  const columns = width >= 900 ? 15 : width >= 700 ? 12 : 8
  const rows = columns === 15 ? 10 : columns === 12 ? 8 : 12
  const title: GridArea = {
    columnStart: 2,
    columnEnd: 8,
    rowStart: columns === 12 ? 2 : 3,
    rowEnd: columns === 12 ? 4 : 5
  }
  const subtitle: GridArea = {
    columnStart: 2,
    columnEnd: columns === 8 ? 6 : 11,
    rowStart: columns === 12 ? 5 : 6,
    rowEnd: columns === 8 ? 8 : columns === 12 ? 6 : 7
  }
  const logoRow = columns === 15 ? 8 : columns === 12 ? 7 : 9
  return { columns, rows, title, subtitle, logoRow }
}

export function isPartnershipCellCovered(
  grid: ReturnType<typeof getPartnershipGrid>,
  column: number,
  row: number
) {
  // Grid placements are one-based; tile indices are zero-based.
  const inArea = (area: GridArea) =>
    column + 1 >= area.columnStart &&
    column + 1 < area.columnEnd &&
    row + 1 >= area.rowStart &&
    row + 1 < area.rowEnd
  return (
    inArea(grid.title) ||
    inArea(grid.subtitle) ||
    (row + 1 === grid.logoRow && (column === 1 || column === 2))
  )
}
