import { validateGeoreferencedMap, parseAnnotation } from '@allmaps/annotation'

import { cachedFetch } from './fetch.js'

import type { IRequest } from 'itty-router'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { WorkerEnv } from '@allmaps/env/worker'

function parseQueryString(query: string | string[] | undefined) {
  return query ? (Array.isArray(query) ? query[0] : query) : undefined
}

export async function mapsFromParams(
  env: WorkerEnv,
  req: IRequest
): Promise<GeoreferencedMap[]> {
  const params = req.params

  const mapId = params?.mapId
  const imageId = params?.imageId
  const manifestId = params?.manifestId

  let url
  if (mapId) {
    url = `${env.PUBLIC_REST_BASE_URL}/maps/${mapId}`
  } else if (imageId) {
    url = `${env.PUBLIC_REST_BASE_URL}/images/${imageId}/maps`
  } else if (manifestId) {
    url = `${env.PUBLIC_REST_BASE_URL}/manifests/${manifestId}/maps`
  } else {
    return []
  }

  const mapsResponse = await cachedFetch(url)

  if (!mapsResponse) {
    throw new Error(`Error fetching maps from URL: ${url}`)
  }

  const fetchedMaps = await mapsResponse.json()
  const georeferencedMapOrMaps = validateGeoreferencedMap(fetchedMaps)

  let georeferencedMaps: GeoreferencedMap[]
  if (Array.isArray(georeferencedMapOrMaps)) {
    georeferencedMaps = georeferencedMapOrMaps
  } else {
    georeferencedMaps = [georeferencedMapOrMaps]
  }

  // Only return maps with at least 3 GCPs
  // TODO: move this check to schema parser
  return georeferencedMaps.filter(
    (georeferencedMap) => georeferencedMap.gcps.length >= 3
  )
}

export async function mapsFromQuery(
  req: IRequest
): Promise<GeoreferencedMap[]> {
  const query = req.query

  const url = parseQueryString(query.url)
  const annotation = parseQueryString(query.annotation)

  if (annotation) {
    const georeferencedMaps = parseAnnotation(JSON.parse(annotation))
    return georeferencedMaps
  } else if (url) {
    const annotationResponse = await cachedFetch(url)

    if (!annotationResponse) {
      throw new Error(`Error fetching annotation from URL: ${url}`)
    }

    const fetchedAnnotation = await annotationResponse.json()

    const georeferencedMaps = parseAnnotation(fetchedAnnotation)

    // Only return maps with at least 3 GCPs
    // TODO: move this check to schema parser
    return georeferencedMaps.filter(
      (georeferecendeMap) => georeferecendeMap.gcps.length >= 3
    )
  } else {
    throw new Error('No annotation query parameter supplied')
  }
}
