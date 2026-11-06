import { bboxToSize, computeBbox } from '@allmaps/stdlib'
import { createImageSources, type ImageSizeLimits } from './responsive-image.ts'

import type { GeoreferencedMap } from '@allmaps/annotation'

export type MaskedMapData = {
  annotationUrl: string
  imageUrl: string
  imageSrcset: string
  imageSizes?: string
  intrinsicWidth: number
  intrinsicHeight: number
  imageClipPath: string
  imageWidth: number
  imageHeight: number
  imageX: number
  imageY: number
  width: number
  height: number
  polygonPoints: string
}

export function createMaskedMap(
  map: GeoreferencedMap,
  annotationUrl: string,
  imageServiceUrl = map.resource.id,
  limits: ImageSizeLimits = {}
): MaskedMapData {
  const { width, height } = map.resource
  if (!width || !height) {
    throw new Error(`Missing image dimensions for ${annotationUrl}`)
  }

  const bbox = computeBbox(map.resourceMask)
  const [maskWidth, maskHeight] = bboxToSize(bbox)
  if (!(maskWidth > 0 && maskHeight > 0)) {
    throw new Error(`Empty resource mask for ${annotationUrl}`)
  }

  // Normalize both the image and mask into the same SVG coordinate system.
  // Leave room around the mask for the outline, including on small screens.
  const scale = 1000 / maskWidth
  const padding = 16

  return {
    annotationUrl,
    ...createImageSources(imageServiceUrl, width, height, limits),
    imageClipPath: `polygon(${map.resourceMask
      .map(([x, y]) => `${(x / width) * 100}% ${(y / height) * 100}%`)
      .join(', ')})`,
    imageWidth: width * scale,
    imageHeight: height * scale,
    imageX: padding - bbox[0] * scale,
    imageY: padding - bbox[1] * scale,
    width: 1000 + padding * 2,
    height: maskHeight * scale + padding * 2,
    polygonPoints: map.resourceMask
      .map(([x, y]) =>
        [padding + (x - bbox[0]) * scale, padding + (y - bbox[1]) * scale].join(
          ','
        )
      )
      .join(' ')
  }
}
