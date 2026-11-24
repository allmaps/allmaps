import { parseLanguageString } from '@allmaps/iiif-inspector'

import { parseResourceUrl } from './urls.ts'

import type { EmbeddedImage, Image, Manifest } from '@allmaps/iiif-parser'

export type ResourcePreview = {
  title: string
  imageLabel?: string
  imageUrl?: string
  imageCount?: number
  resourceUrl?: string
  resourceType: 'image' | 'manifest'
}

function getPreviewImageUrl(image: Image | EmbeddedImage | undefined) {
  if (!image) return

  try {
    const request = image.getImageRequest(
      {
        width: Math.min(image.width, 480),
        height: Math.min(image.height, 360)
      },
      'contain'
    )
    if (!Array.isArray(request) && request.size) {
      return parseResourceUrl(image.getImageUrl(request))?.href
    }
  } catch {
    // Metadata can still be displayed when a service cannot provide a preview.
  }
}

export function getResourcePreview(
  resource: Image | Manifest,
  language = 'en'
): ResourcePreview {
  const manifest = resource.type === 'manifest' ? resource : undefined
  const canvas = manifest?.canvases[0]
  const image = resource.type === 'image' ? resource : canvas?.image
  const title =
    parseLanguageString(manifest?.label, language) ||
    parseLanguageString(canvas?.label, language) ||
    (manifest ? 'IIIF Manifest' : 'IIIF Image')
  const imageLabel = parseLanguageString(canvas?.label, language)
  const imageUrl =
    parseResourceUrl(canvas?.thumbnail?.[0]?.id ?? null)?.href ||
    getPreviewImageUrl(image) ||
    parseResourceUrl(manifest?.thumbnail?.[0]?.id ?? null)?.href

  return {
    title,
    imageLabel: imageLabel !== title ? imageLabel : undefined,
    imageUrl,
    imageCount: manifest?.canvases.length,
    resourceUrl: parseResourceUrl(resource.uri)?.href,
    resourceType: resource.type
  }
}
