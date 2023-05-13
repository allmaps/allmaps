import { validateMap, parseAnnotation } from '@allmaps/annotation'

import { cachedFetch } from './fetch.js'

import type { Cache } from './types.js'
import type { Map, Maps } from '@allmaps/annotation'
import type { Obj } from 'itty-router'

export async function mapFromParams(
  cache: Cache,
  env: unknown,
  params: Obj | undefined
): Promise<Map> {
  const mapId = params?.mapId

  let baseUrl: string | undefined

  if (env && typeof env === 'object' && 'API_BASE_URL' in env) {
    baseUrl = String(env.API_BASE_URL)
  }

  if (!baseUrl) {
    throw new Error('Base URL not found in API_BASE_URL environment variable')
  }

  const url = `${baseUrl}/maps/${mapId}`
  const mapResponse = await cachedFetch(cache, url)

  if (!mapResponse) {
    throw new Error(`Error fetching maps from URL: ${url}`)
  }

  const fetchedMap = await mapResponse.json()
  const mapOrMaps = validateMap(fetchedMap)

  let map: Map
  if (Array.isArray(mapOrMaps)) {
    map = mapOrMaps[0]
  } else {
    map = mapOrMaps
  }

  return map
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
    return maps
  } else {
    throw new Error('No annotation query parameter supplied')
  }
}
