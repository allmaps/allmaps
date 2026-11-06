// Match the first three rows across the compact and partnership heroes.
export function getMaskGridRowName(row: number) {
  return (
    ['mask-grid-top', 'mask-grid-middle', 'mask-grid-bottom'][row] ??
    `mask-grid-row-${row + 1}`
  )
}
