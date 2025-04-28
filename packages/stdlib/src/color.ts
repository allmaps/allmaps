import hexRgb from 'hex-rgb'
import rgbHex from 'rgb-hex'

import type { Color, ColorWithTransparancy } from '@allmaps/types'

/**
 * Convert RBG to HEX
 * @param rgb - RGB color array, e.g. [0, 51, 255]
 * @returns HEX string, e.g. '#0033ff'
 */
export function rgbToHex(color: Color): string {
  return '#' + rgbHex(...color)
}

/**
 * Convert RBGA to HEX
 * @param rgb - RGBA color array, e.g. [0, 51, 255, 255]
 * @returns HEX string, e.g. '#0033ffff'
 */
export function rgbaToHex(color: ColorWithTransparancy): string {
  return '#' + rgbHex(...color)
}

/**
 * Convert HEX to RGB
 * @param hex - HEX string, e.g. '#0033ff'
 * @returns RGB, e.g. [0, 51, 255]
 */
export function hexToRgb(hex: string): Color {
  return hexRgb(hex, { format: 'array' }).slice(0, 3) as Color
}

/**
 * Convert HEX to RGB
 * @param hex - HEX string, e.g. '#0033ffff'
 * @returns RGB, e.g. [0, 51, 255, 255]
 */
export function hexToRgba(hex: string): ColorWithTransparancy {
  const color = hexRgb(hex, { format: 'array' })
  if (color.length < 4) {
    color[3] = 255
  }
  return color
}

/**
 * Convert HEX to RGB, and sets the transparency to 255
 * @param hex - HEX string, e.g. '#0033ffcc'
 * @returns RGB, e.g. [0, 51, 255, 255]
 */
export function hexToOpaqueRgba(hex: string): ColorWithTransparancy {
  const color = hexRgb(hex, { format: 'array' })
  color[3] = 255
  return color
}

/**
 * Convert hex to fractional RGB
 * @param hex - hex string, e.g. '#0033ff'
 * @returns Fractional RGB, e.g. [0, 0.2, 1]
 */
export function hexToFractionalRgb(hex: string): Color {
  return hexToRgb(hex).map((c) => c / 255) as Color
}

/**
 * Convert hex to fractional RGBA
 * @param hex - hex string, e.g. '#0033ffff'
 * @returns Fractional RGB, e.g. [0, 0.2, 1, 1]
 */
export function hexToFractionalRgba(hex: string): ColorWithTransparancy {
  return hexToRgba(hex).map((c) => c / 255) as ColorWithTransparancy
}

/**
 * Convert hex to fractional RGBA, and sets the transparency to 1
 * @param hex - hex string, e.g. '#0033ffcc'
 * @returns Fractional RGB, e.g. [0, 0.2, 1, 1]
 */
export function hexToFractionalOpaqueRgba(hex: string): ColorWithTransparancy {
  return hexToOpaqueRgba(hex).map((c) => c / 255) as ColorWithTransparancy
}
