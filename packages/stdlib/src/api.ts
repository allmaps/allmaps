import type {
  Image,
  EmbeddedImage,
  Manifest,
  Collection
} from '@allmaps/iiif-parser'

import { fetchJson } from './fetch.js'

function fetchAnnotationsByIiifUrl(url: string) {
  // TODO: move base URLs to env/config file
  return fetchJson(`https://annotations.allmaps.org/?url=${url}`)
}

async function fetchAnnotationsForImage(
  parsedImage: Image | EmbeddedImage
): Promise<unknown[]> {
  try {
    const annotations = await fetchAnnotationsByIiifUrl(
      `${parsedImage.uri}/info.json`
    )
    return [annotations]
  } catch (err) {
    return []
  }
}

async function fetchAnnotationsForManifest(
  parsedManifest: Manifest
): Promise<unknown[]> {
  try {
    const annotations = await fetchAnnotationsByIiifUrl(parsedManifest.uri)
    return [annotations]
  } catch (err) {
    let annotations: unknown[] = []
    for (let canvas of parsedManifest.canvases) {
      const imageAnnotations = await fetchAnnotationsForImage(canvas.image)
      annotations.push(...imageAnnotations)
    }

    return annotations
  }
}

async function fetchAnnotationsForCollection(
  parsedCollection: Collection
): Promise<unknown[]> {
  try {
    const annotations = await fetchAnnotationsByIiifUrl(parsedCollection.uri)
    return [annotations]
  } catch (err) {
    let annotations: unknown[] = []
    for (let item of parsedCollection.items) {
      if (item.type === 'collection') {
        const itemAnnotations = await fetchAnnotationsForCollection(item)
        annotations.push(...itemAnnotations)
      } else if (item.type === 'manifest' && 'canvases' in item) {
        const itemAnnotations = await fetchAnnotationsForManifest(item)
        annotations.push(...itemAnnotations)
      }
    }

    return annotations
  }
}

export function fetchAnnotationsFromApi(
  parsedIiif: Image | Manifest | Collection
) {
  if (parsedIiif.type === 'image') {
    return fetchAnnotationsForImage(parsedIiif)
  } else if (parsedIiif.type === 'manifest') {
    return fetchAnnotationsForManifest(parsedIiif)
  } else if (parsedIiif.type === 'collection') {
    return fetchAnnotationsForCollection(parsedIiif)
  } else {
    throw new Error('Unsupported IIIF resource')
  }
}
