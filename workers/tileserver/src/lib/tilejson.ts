import { json } from 'itty-router'
import { WarpedMapList, type WarpedMap } from '@allmaps/render'
import { lonLatToWebMercator } from '@allmaps/project'

import { createCachedFetch } from './fetch.js'

import type { TransformationOptions } from './types.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { WorkerEnv } from '@allmaps/env/worker'
import type { Bbox, Point, Size } from '@allmaps/types'

const MIN_ZOOM = 0
const MAX_TILEJSON_ZOOM = 30

const DEFAULT_TILEJSON_VIEWPORT_SIZE: Size = [512, 512]

// Web Mercator meters per CSS pixel at z0 for 256px XYZ tiles.
const WEB_MERCATOR_INITIAL_RESOLUTION = 156543.03392804097

// See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
export async function generateTileJsonResponse(
  env: WorkerEnv,
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  urlTemplates: string[]
): Promise<Response> {
  // TODO: simplify this when this will be aligned with TransformationOptions from @allmaps/render
  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const cachedFetch = createCachedFetch(env)

  const warpedMapList = new WarpedMapList({
    fetchFn: cachedFetch,
    createRTree: false,
    transformationType
  })

  for (const georeferencedMap of georeferencedMaps) {
    await warpedMapList.addGeoreferencedMap(georeferencedMap)
  }

  // Get bounds and center in EPSG:4326 (lon/lat) as required by TileJSON spec
  const bounds = warpedMapList.getMapsBbox()
  const center = warpedMapList.getMapsCenter()

  if (!bounds || !center) {
    throw new Error('Could not compute bounding box and center of maps')
  }

  const minzoom = MIN_ZOOM
  const maxzoom = getMaxZoom(warpedMapList)
  const centerZoom = getFitZoom(bounds, maxzoom)

  return json({
    tilejson: '3.0.0',
    // TODO: add name and description fields
    // name:
    // description:
    id: urlTemplates[0],
    tiles: urlTemplates,
    fields: {},
    bounds,
    center: [...center, centerZoom],
    minzoom,
    maxzoom
  })
}

function getMaxZoom(warpedMapList: WarpedMapList<WarpedMap>): number {
  const nativeZooms = warpedMapList.getWarpedMaps().map((warpedMap) => {
    return Math.log2(
      WEB_MERCATOR_INITIAL_RESOLUTION * warpedMap.resourceToProjectedGeoScale
    )
  })

  return clampZoom(Math.ceil(Math.max(...nativeZooms)))
}

function getFitZoom(
  bounds: Bbox,
  maxzoom: number,
  viewportSize = DEFAULT_TILEJSON_VIEWPORT_SIZE
): number {
  const projectedBbox = geoBboxToProjectedGeoBbox(bounds)
  const projectedSize = bboxToSize(projectedBbox)

  const zoomForWidth = Math.log2(
    viewportSize[0] / (projectedSize[0] / WEB_MERCATOR_INITIAL_RESOLUTION)
  )
  const zoomForHeight = Math.log2(
    viewportSize[1] / (projectedSize[1] / WEB_MERCATOR_INITIAL_RESOLUTION)
  )

  return clampZoom(Math.floor(Math.min(zoomForWidth, zoomForHeight)), maxzoom)
}

function geoBboxToProjectedGeoBbox([west, south, east, north]: Bbox): Bbox {
  return [
    ...lonLatToWebMercator([west, south] as Point),
    ...lonLatToWebMercator([east, north] as Point)
  ]
}

function bboxToSize([minX, minY, maxX, maxY]: Bbox): Size {
  return [Math.abs(maxX - minX), Math.abs(maxY - minY)]
}

function clampZoom(zoom: number, maxzoom = MAX_TILEJSON_ZOOM): number {
  if (!Number.isFinite(zoom)) {
    return MIN_ZOOM
  }

  return Math.min(maxzoom, Math.max(MIN_ZOOM, zoom))
}
