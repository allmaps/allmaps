import type { CollageMap } from './model.ts'
import { abortable } from './export-image.ts'
import { applyPixelEffects, hasPixelEffects } from './export-effects.ts'
import { validateImageSize } from './export-view.ts'

/** Keep the complete, unwarped image. Only color operations become pixels;
 * clipping, opacity, rotation, scale, reflection and skew remain PDF objects. */
export async function pdfImageEffects(
  source: string,
  appearance: CollageMap['appearance'],
  signal: AbortSignal
): Promise<string> {
  signal.throwIfAborted()
  if (!hasPixelEffects(appearance)) return source
  const image = new Image()
  const canvas = document.createElement('canvas')
  try {
    image.src = source
    await abortable(image.decode(), signal)
    validateImageSize(image.naturalWidth, image.naturalHeight)
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context)
      throw new Error('Could not allocate the image for color effects.')
    context.drawImage(image, 0, 0)
    // Bound pixel buffers and yield between strips for cancellation on tablets.
    for (let y = 0; y < canvas.height; y += 128) {
      signal.throwIfAborted()
      const strip = context.getImageData(
        0,
        y,
        canvas.width,
        Math.min(128, canvas.height - y)
      )
      applyPixelEffects(strip.data, appearance)
      context.putImageData(strip, 0, y)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    signal.throwIfAborted()
    return canvas.toDataURL('image/png')
  } finally {
    image.src = ''
    canvas.width = canvas.height = 0
  }
}
