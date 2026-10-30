import { generateId } from '@allmaps/id'

import type {
  Image,
  EmbeddedImage,
  Manifest,
  Collection
} from '@allmaps/iiif-parser'

/** Maximum number of maps available without authentication in the Allmaps APIs. */
export const PUBLIC_API_MAX_LIMIT = 200

/**
 * Choose credentials for a public map search. Larger requests still need the
 * signed-in user's tier; ordinary searches can use the shared response cache.
 * @param limit - Requested number of maps
 * @returns Fetch credentials mode
 */
export function getMapQueryCredentials(limit: number): RequestCredentials {
  return Number.isInteger(limit) && limit > 0 && limit <= PUBLIC_API_MAX_LIMIT
    ? 'omit'
    : 'include'
}

type Hash = string

type AllmapsId = `manifests/${Hash}` | `images/${Hash}`

function fetchAnnotationsByAllmapsId(
  annotationsBaseUrl: string,
  allmapsId: AllmapsId,
  fetch = globalThis.fetch
) {
  // TODO: move base URLs to env/config file
  return fetch(`${annotationsBaseUrl}/${allmapsId}`, {
    credentials: 'omit'
  }).then((response) => response.json())
}

async function fetchAnnotationsForImage(
  annotationsBaseUrl: string,
  parsedImage: Image | EmbeddedImage,
  fetch?: typeof globalThis.fetch
) {
  const allmapsId: AllmapsId = `images/${await generateId(parsedImage.uri)}`
  return fetchAnnotationsByAllmapsId(annotationsBaseUrl, allmapsId, fetch)
}

async function fetchAnnotationsForManifest(
  annotationsBaseUrl: string,
  parsedManifest: Manifest,
  fetch?: typeof globalThis.fetch
) {
  const allmapsId: AllmapsId = `manifests/${await generateId(parsedManifest.uri)}`
  return fetchAnnotationsByAllmapsId(annotationsBaseUrl, allmapsId, fetch)
}

/**
 * Fetch georeference annotations for a IIIF image or manifest.
 * @param annotationsBaseUrl - Annotations API base URL, such as
 * https://annotations.allmaps.org, serving annotation resources at /images/{id}
 * and /manifests/{id}. Do not pass the REST API base URL.
 * @param parsedIiif - Parsed IIIF image or manifest
 * @param fetch - Optional fetch implementation
 * @returns Georeference annotations for the IIIF resource
 */
export function fetchAnnotationsFromApi(
  annotationsBaseUrl: string,
  parsedIiif: Image | Manifest | Collection,
  fetch?: typeof globalThis.fetch
) {
  if (parsedIiif.type === 'image') {
    return fetchAnnotationsForImage(annotationsBaseUrl, parsedIiif, fetch)
  } else if (parsedIiif.type === 'manifest') {
    return fetchAnnotationsForManifest(annotationsBaseUrl, parsedIiif, fetch)
  } else {
    throw new Error('Unsupported IIIF resource')
  }
}
