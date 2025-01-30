import type { Color } from '@allmaps/types'

/**
 * Convert RBG to hex
 * @param rgb - RGB color array, e.g. [0, 51, 255]
 * @returns hex string, e.g. '#0033ff'
 */
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

/**
 * Convert hex to RGB
 * @param hex - hex string, e.g. '#0033ff'
 * @returns RGB, e.g. [0, 51, 255]
 */
export function hexToRgb(hex: string): Color {
  const bigint = parseInt(hex.replace(/^#/, ''), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}

/**
 * Convert hex to fractional RGB
 * @param hex - hex string, e.g. '#0033ff'
 * @returns Fractional RGB, e.g. [0, 0.2, 1]
 */
export function hexToFractionalRgb(hex: string): Color {
  return hexToRgb(hex).map((c) => c / 255) as [number, number, number]
}
