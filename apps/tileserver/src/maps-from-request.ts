import { validateMap, parseAnnotation } from '@allmaps/annotation'

import { cachedFetch } from './fetch.js'

import type { Map, Maps } from '@allmaps/annotation'
import type { IRequest } from 'itty-router'

function parseQueryString(query: string | string[] | undefined) {
  return query ? (Array.isArray(query) ? query[0] : query) : undefined
}

export async function mapsFromParams(
  env: unknown,
  req: IRequest
): Promise<Map[]> {
  const params = req.params

  const mapId = params?.mapId
  const imageId = params?.imageId
  const manifestId = params?.manifestId

  if (!env || typeof env !== 'object') {
    throw new Error('No env object supplied')
  }

  if (
    !('API_BASE_URL' in env) ||
    env.API_BASE_URL === undefined ||
    typeof env.API_BASE_URL !== 'string'
  ) {
    throw new Error('No API_BASE_URL supplied')
  }

  let url
  if (mapId) {
    url = `${env.API_BASE_URL}/maps/${mapId}`
  } else if (imageId) {
    url = `${env.API_BASE_URL}/images/${imageId}/maps`
  } else if (manifestId) {
    url = `${env.API_BASE_URL}/manifests/${manifestId}/maps`
  } else {
    return []
  }

  const mapsResponse = await cachedFetch(url)

  if (!mapsResponse) {
    throw new Error(`Error fetching maps from URL: ${url}`)
  }

  const fetchedMaps = await mapsResponse.json()
  const mapOrMaps = validateMap(fetchedMaps)

  let maps: Map[]
  if (Array.isArray(mapOrMaps)) {
    maps = mapOrMaps
  } else {
    maps = [mapOrMaps]
  }

  // Only return maps with at least 3 GCPs
  return maps.filter((map) => map.gcps.length >= 3)
}

export async function mapsFromQuery(req: IRequest): Promise<Maps> {
  const query = req.query

  const url = parseQueryString(query.url)
  const annotation = parseQueryString(query.annotation)

  if (annotation) {
    const maps = parseAnnotation(JSON.parse(annotation))
    return maps
  } else if (url) {
    const annotationResponse = await cachedFetch(url)

    if (!annotationResponse) {
      throw new Error(`Error fetching annotation from URL: ${url}`)
    }

    const fetchedAnnotation = await annotationResponse.json()

    const maps = parseAnnotation(fetchedAnnotation)

    // Only return maps with at least 3 GCPs
    return maps.filter((map) => map.gcps.length >= 3)
  } else {
    throw new Error('No annotation query parameter supplied')
  }
}
