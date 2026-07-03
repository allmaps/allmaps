import { hexToFractionalRgb, hexToFractionalOpaqueRgba } from '@allmaps/stdlib'

import type { Color, ColorWithTransparancy } from '@allmaps/types'

const fractionalRgbCache = new Map<
  string,
  ReturnType<typeof hexToFractionalRgb>
>()
const fractionalOpaqueRgbaCache = new Map<
  string,
  ReturnType<typeof hexToFractionalOpaqueRgba>
>()

/**
 * Cached version of hexToFractionalRgb.
 */
export function getCachedFractionalRgb(hex: string): Color {
  let rgb = fractionalRgbCache.get(hex)
  if (!rgb) {
    rgb = hexToFractionalRgb(hex)
    fractionalRgbCache.set(hex, rgb)
  }
  return rgb
}

/**
 * Cached version of hexToFractionalOpaqueRgba.
 */
export function getCachedFractionalOpaqueRgba(
  hex: string
): ColorWithTransparancy {
  let rgba = fractionalOpaqueRgbaCache.get(hex)
  if (!rgba) {
    rgba = hexToFractionalOpaqueRgba(hex)
    fractionalOpaqueRgbaCache.set(hex, rgba)
  }
  return rgba
}
