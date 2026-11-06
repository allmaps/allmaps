import { getImage } from 'astro:assets'
import type { ImageMetadata } from 'astro'

/** Optimize bundled screenshots without changing their capture or geometry. */
export async function getScreenshotImage(image: ImageMetadata) {
  const optimized = await getImage({
    src: image,
    widths: [...new Set([480, 960, 1440, 1920, image.width])]
      .filter((width) => width <= image.width)
      .sort((a, b) => a - b),
    format: 'webp',
    quality: 90
  })

  return {
    src: optimized.src,
    srcset: optimized.srcSet.attribute,
    sizes: 'auto, 100vw'
  }
}
