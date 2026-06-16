import { generateId } from '@allmaps/id'

import type {
  Image,
  EmbeddedImage,
  Manifest,
  Collection
} from '@allmaps/iiif-parser'

type Hash = string

type AllmapsId = `manifests/${Hash}` | `images/${Hash}`

function fetchAnnotationsByAllmapsId(
  restBaseUrl: string,
  allmapsId: AllmapsId,
  fetch = globalThis.fetch
) {
  // TODO: move base URLs to env/config file
  return fetch(`${restBaseUrl}/${allmapsId}`).then((response) =>
    response.json()
  )
}

async function fetchAnnotationsForImage(
  restBaseUrl: string,
  parsedImage: Image | EmbeddedImage,
  fetch?: typeof globalThis.fetch
) {
  const allmapsId: AllmapsId = `images/${await generateId(parsedImage.uri)}`
  return fetchAnnotationsByAllmapsId(restBaseUrl, allmapsId, fetch)
}

async function fetchAnnotationsForManifest(
  restBaseUrl: string,
  parsedManifest: Manifest,
  fetch?: typeof globalThis.fetch
) {
  const allmapsId: AllmapsId = `manifests/${await generateId(parsedManifest.uri)}`
  return fetchAnnotationsByAllmapsId(restBaseUrl, allmapsId, fetch)
}

export function fetchAnnotationsFromApi(
  restBaseUrl: string,
  parsedIiif: Image | Manifest | Collection,
  fetch?: typeof globalThis.fetch
) {
  if (parsedIiif.type === 'image') {
    return fetchAnnotationsForImage(restBaseUrl, parsedIiif, fetch)
  } else if (parsedIiif.type === 'manifest') {
    return fetchAnnotationsForManifest(restBaseUrl, parsedIiif, fetch)
  } else {
    throw new Error('Unsupported IIIF resource')
  }
}
