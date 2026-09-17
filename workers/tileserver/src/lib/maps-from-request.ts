import { validateGeoreferencedMap, parseAnnotation } from '@allmaps/annotation'
import { TileError } from './tile-error.js'

import { createCachedFetch } from './fetch.js'

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
  const cachedFetch = createCachedFetch(env)
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

  const fetchedMaps = await fetchMapData(cachedFetch, url)
  const georeferencedMapOrMaps = parseMapData(() =>
    validateGeoreferencedMap(fetchedMaps)
  )

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
  env: WorkerEnv,
  req: IRequest
): Promise<GeoreferencedMap[]> {
  const cachedFetch = createCachedFetch(env)
  const query = req.query

  const url = parseQueryString(query.url)
  const annotation = parseQueryString(query.annotation)

  if (annotation) {
    const georeferencedMaps = parseMapData(() =>
      parseAnnotation(JSON.parse(annotation))
    )
    return georeferencedMaps.filter((map) => map.gcps.length >= 3)
  } else if (url) {
    const fetchedAnnotation = await fetchMapData(cachedFetch, url)
    const georeferencedMaps = parseMapData(() =>
      parseAnnotation(fetchedAnnotation)
    )

    // Only return maps with at least 3 GCPs
    // TODO: move this check to schema parser
    return georeferencedMaps.filter(
      (georeferecendeMap) => georeferecendeMap.gcps.length >= 3
    )
  } else {
    throw new TileError('invalid-data', 400)
  }
}

function parseMapData<T>(parse: () => T): T {
  try {
    return parse()
  } catch (cause) {
    throw new TileError('invalid-data', 422, { cause })
  }
}

async function fetchMapData(
  fetchFn: ReturnType<typeof createCachedFetch>,
  url: string
) {
  const response = await fetchFn(url).catch((cause) => {
    throw new TileError('map-data', 502, { cause })
  })
  if (!response.ok)
    throw new TileError('map-data', response.status === 404 ? 404 : 502)
  try {
    return await response.json()
  } catch (cause) {
    throw new TileError('invalid-data', 422, { cause })
  }
}
