import type { Color } from '@allmaps/types'

export function rgbToHex([r, g, b]: Color): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

export function hexToRgb(hex: string): Color {
  const bigint = parseInt(hex.replace(/^#/, ''), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}
