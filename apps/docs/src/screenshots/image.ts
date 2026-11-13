import { getImage } from 'astro:assets'
import type { ImageMetadata } from 'astro'

/** Resize bundled screenshots while preserving full-size WebP captures. */
export async function getScreenshotImage(image: ImageMetadata) {
  const sizes = 'auto, 100vw'
  const useOriginal = image.format === 'webp'
  const widths = [480, 960, 1440, 1920].filter((width) => width < image.width)

  if (!useOriginal) widths.push(image.width)
  if (!widths.length) return { src: image.src, sizes }

  const optimized = await getImage({
    src: image,
    width: widths[widths.length - 1],
    widths,
    format: 'webp',
    quality: 90
  })

  return {
    src: useOriginal ? image.src : optimized.src,
    srcset: useOriginal
      ? `${optimized.srcSet.attribute}, ${image.src} ${image.width}w`
      : optimized.srcSet.attribute,
    sizes
  }
}
