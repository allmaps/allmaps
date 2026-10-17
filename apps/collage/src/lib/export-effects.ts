import type { CollageMap } from './model.ts'
import { hueColor } from './control-layout.ts'

export type ExportEffects = {
  opacity: boolean
  saturation: boolean
  colorize: boolean
  removeBackground: boolean
}

export const defaultExportEffects: ExportEffects = {
  opacity: true,
  saturation: true,
  colorize: true,
  removeBackground: true
}

export const backgroundRemovalThreshold = 1 / 3
export const backgroundRemovalHardness = 0.1

/** Export choices never change the collage, its masks or its geometry. */
export function exportAppearance(
  item: CollageMap,
  effects: ExportEffects = defaultExportEffects
): CollageMap['appearance'] {
  return {
    ...item.appearance,
    opacity: effects.opacity ? item.appearance.opacity : 1,
    saturation: effects.saturation ? item.appearance.saturation : 1,
    colorize: effects.colorize && item.appearance.colorize,
    removeBackground:
      effects.removeBackground && item.appearance.removeBackground
  }
}

export function hasPixelEffects(appearance: CollageMap['appearance']) {
  return (
    appearance.saturation !== 1 ||
    appearance.colorize ||
    (appearance.removeBackground && !!appearance.backgroundColor)
  )
}

/** Match the renderer's post.frag color operations in source coordinates.
 * Opacity, masks and affine geometry are deliberately left to the PDF. */
export function applyPixelEffects(
  pixels: Uint8ClampedArray,
  appearance: CollageMap['appearance']
) {
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const background =
    appearance.removeBackground && appearance.backgroundColor
      ? rgb(appearance.backgroundColor)
      : undefined
  const tint = appearance.colorize ? rgb(hueColor(appearance.hue)) : undefined
  const saturation = appearance.saturation
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i] / 255,
      g = pixels[i + 1] / 255,
      b = pixels[i + 2] / 255
    let amount = 1
    if (background) {
      const distance = Math.hypot(
        r - background[0],
        g - background[1],
        b - background[2]
      )
      const start = backgroundRemovalThreshold * backgroundRemovalHardness
      const t = Math.max(
        0,
        Math.min(1, (distance - start) / (backgroundRemovalThreshold - start))
      )
      amount = t * t * (3 - 2 * t)
    }
    const gray = 0.21 * r + 0.71 * g + 0.07 * b
    r = r * saturation + gray * (1 - saturation)
    g = g * saturation + gray * (1 - saturation)
    b = b * saturation + gray * (1 - saturation)
    // The shader adds color after background removal, then premultiplies.
    // ImageData stores straight alpha, so retain that soft-edge color here.
    pixels[i] = 255 * (tint ? tint[0] + r * amount : r)
    pixels[i + 1] = 255 * (tint ? tint[1] + g * amount : g)
    pixels[i + 2] = 255 * (tint ? tint[2] + b * amount : b)
    pixels[i + 3] *= amount
  }
}
