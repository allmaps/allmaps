import { generateId, generateChecksum } from '@allmaps/id/browser'
import { parseAnnotation } from '@allmaps/annotation'
import {
  createTransformer,
  svgPolygonToGeoJSONPolygon
} from '@allmaps/transform'

import RTree from './RTree.js'

import { fromLonLat, getPolygonBBox } from './shared/geo.js'
import { combineBBoxes } from './shared/bbox.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import { fetchJson } from '@allmaps/stdlib'
import { Image as IIIFImage } from '@allmaps/iiif-parser'

import type { BBox, WarpedMap } from './shared/types.js'

export default class World extends EventTarget {
  warpedMapsById: Map<string, WarpedMap> = new Map()
  imagesById: Map<string, IIIFImage> = new Map()
  rtree?: RTree

  constructor(rtree?: RTree) {
    super()
    this.rtree = rtree
  }

  async addGeorefAnnotation(annotation: any): Promise<(string | Error)[]> {
    let results: (string | Error)[] = []

    const maps = parseAnnotation(annotation)

    for (let map of maps) {
      try {
        const mapId = map.id || (await generateChecksum(map))

        const gcps = map.gcps
        const pixelMask = map.pixelMask

        const sphericalMercatorGcps = gcps.map(({ world, image }) => ({
          world: fromLonLat(world),
          image
        }))

        // TODO: to make sure only tiles for visible parts of the map are requested
        // (and not for parts hidden behind maps on top of it)
        // use https://github.com/mfogel/polygon-clipping to subtract geoMasks of
        // maps that have been added before.
        // Map A (topmost): show completely
        // Map B: B - A
        // Map C: C - B - A
        // Map D: D - C - B - A

        const transformer = createTransformer(sphericalMercatorGcps)
        const geoMask = svgPolygonToGeoJSONPolygon(transformer, pixelMask)

        // TODO: only load info.json when its needed
        const imageUri = map.image.uri
        const imageInfoJson = await fetchJson(`${imageUri}/info.json`)
        const parsedImage = IIIFImage.parse(imageInfoJson)
        const imageId = await generateId(imageUri)

        const warpedMap: WarpedMap = {
          imageId,
          mapId,
          parsedImage,
          pixelMask,
          transformer,
          geoMask
        }

        this.imagesById.set(imageId, parsedImage)
        this.warpedMapsById.set(mapId, warpedMap)

        if (this.rtree) {
          await this.rtree.addItem(mapId, geoMask)
        }

        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, mapId)
        )

        results.push(mapId)
      } catch (err) {
        if (err instanceof Error) {
          results.push(err)
        }
      }
    }

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFANNOTATIONADDED)
    )

    return results
  }

  getPossibleVisibleWarpedMapIds(geoBBox: BBox) {
    if (this.rtree) {
      return this.rtree.searchBBox(geoBBox)
    } else {
      return this.warpedMapsById.keys()
    }
  }

  getWarpedMaps() {
    return this.warpedMapsById.values()
  }

  getWarpedMap(mapId: string) {
    return this.warpedMapsById.get(mapId)
  }

  getBBox(): BBox | undefined {
    let bbox

    for (let warpedMap of this.warpedMapsById.values()) {
      const warpedMapBBox = getPolygonBBox(warpedMap.geoMask)

      if (!bbox) {
        bbox = warpedMapBBox
      } else {
        bbox = combineBBoxes(bbox, warpedMapBBox)
      }
    }

    return bbox
  }
}
