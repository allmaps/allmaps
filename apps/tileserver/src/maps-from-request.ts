import { validateMap, parseAnnotation } from '@allmaps/annotation'

import { cachedFetch } from './fetch.js'

import type { Cache } from './types.js'
import type { Map, Maps } from '@allmaps/annotation'
import type { Obj } from 'itty-router'

export async function mapsFromParams(
  cache: Cache,
  env: unknown,
  params: Obj | undefined
): Promise<Map[]> {
  const mapId = params?.mapId
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
  } else if (manifestId) {
    url = `${env.API_BASE_URL}/manifests/${manifestId}/maps`
  } else {
    return []
  }

  const mapsResponse = await cachedFetch(cache, url)

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

export async function mapsFromQuery(
  cache: Cache,
  query: Obj | undefined
): Promise<Maps> {
  if (query?.annotation) {
    const annotation = JSON.parse(query.annotation)

    const maps = parseAnnotation(annotation)
    return maps
  } else if (query?.url) {
    const annotationResponse = await cachedFetch(cache, query.url)

    if (!annotationResponse) {
      throw new Error(`Error fetching annotation from URL: ${query.url}`)
    }

    const fetchedAnnotation = await annotationResponse.json()

    const maps = parseAnnotation(fetchedAnnotation)

    // Only return maps with at least 3 GCPs
    return maps.filter((map) => map.gcps.length >= 3)
  } else {
    throw new Error('No annotation query parameter supplied')
  }
}
