import { validateMap, parseAnnotation } from '@allmaps/annotation'

import { cachedFetch } from './fetch.js'

import type { Cache } from './types.js'
import type { Map } from '@allmaps/annotation'
import type { Obj } from 'itty-router'

export async function mapFromParams(params: Obj| undefined, cache: Cache): Promise<Map> {
  const mapId = params?.mapId

  const mapResponse = await cachedFetch(
    cache,
    `https://dev.api.allmaps.org/maps/${mapId}`
  )

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

export function mapFromQuery(query: Obj| undefined): Map {
  if (query?.annotation) {
    const annotation = JSON.parse(query.annotation)

    const maps = parseAnnotation(annotation)
    if (maps.length !== 1) {
      throw new Error('Annotation must contain exactly one map')
    }
    const map = maps[0]
    return map
  } else {
    throw new Error('No annotation query parameter supplied')
  }
}
