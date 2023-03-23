import { generateId, generateChecksum } from '@allmaps/id/browser'
import { parseAnnotation, type Map as Georef } from '@allmaps/annotation'
import {
  createTransformer,
  toGeoJSONPolygon
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
  zIndices: Map<string, number> = new Map()

  rtree?: RTree

  constructor(rtree?: RTree) {
    super()
    this.rtree = rtree
  }

  private async getMapId(map: Georef) {
    const mapId = map.id || (await generateChecksum(map))
    return mapId
  }

  async addGeorefAnnotation(annotation: any): Promise<(string | Error)[]> {
    let results: (string | Error)[] = []

    const maps = parseAnnotation(annotation)

    for (let map of maps) {
      try {
        const mapId = await this.getMapId(map)

        const gcps = map.gcps
        const pixelMask = map.pixelMask

        const sphericalMercatorGcps = gcps.map(({ world, image }) => ({
          world: fromLonLat(world),
          image
        }))

        // TODO: to make sure only tiles for visible parts of the map are requested
        // (and not for parts hidden behind maps on top of it)
        // Subtract geoMasks of maps that have been added before the current map:
        // Map A (topmost): show completely
        // Map B: B - A
        // Map C: C - B - A
        // Map D: D - C - B - A
        //
        // Possible libraries:
        //  - https://github.com/w8r/martinez
        //  - https://github.com/mfogel/polygon-clipping

        const transformer = createTransformer(sphericalMercatorGcps)
        const geoMask = toGeoJSONPolygon(transformer, pixelMask)

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

        this.warpedMapsById.set(mapId, warpedMap)

        const zIndex = this.warpedMapsById.size - 1
        this.zIndices.set(mapId, zIndex)

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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))

    return results
  }

  async removeGeorefAnnotation(annotation: any): Promise<(string | Error)[]> {
    let results: (string | Error)[] = []

    const maps = parseAnnotation(annotation)

    for (let map of maps) {
      try {
        const mapId = await this.getMapId(map)

        const warpedMap = this.warpedMapsById.get(mapId)

        if (warpedMap) {
          this.warpedMapsById.delete(mapId)
          this.zIndices.delete(mapId)

          if (this.rtree) {
            this.rtree.removeItem(mapId)
          }

          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.WARPEDMAPREMOVED, mapId)
          )
        } else {
          throw new Error(`No map found with ID ${mapId}`)
        }

        results.push(mapId)
      } catch (err) {
        if (err instanceof Error) {
          results.push(err)
        }
      }
    }

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFANNOTATIONREMOVED)
    )

    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))

    return results
  }

  private removeZIndexHoles() {
    const sortedZIndices = [...this.zIndices.entries()].sort(
      (entryA, entryB) => entryA[1] - entryB[1]
    )

    let zIndex = 0

    for (let entry of sortedZIndices) {
      const mapId = entry[0]
      this.zIndices.set(mapId, zIndex)
      zIndex++
    }
  }

  getZIndex(mapId: string) {
    return this.zIndices.get(mapId)
  }

  bringToFront(mapIds: Iterable<string>) {
    let newZIndex = this.warpedMapsById.size

    for (let mapId of mapIds) {
      if (this.zIndices.has(mapId)) {
        this.zIndices.set(mapId, newZIndex)
        newZIndex++
      }
    }

    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  sendToBack(mapIds: string[]) {
    let newZIndex = -mapIds.length

    for (let mapId of mapIds) {
      if (this.zIndices.has(mapId)) {
        this.zIndices.set(mapId, newZIndex)
        newZIndex++
      }
    }

    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  bringForward(mapIds: Iterable<string>) {
    for (let [mapId, zIndex] of this.zIndices.entries()) {
      this.zIndices.set(mapId, zIndex * 2)
    }

    for (let mapId of mapIds) {
      const zIndex = this.zIndices.get(mapId)
      if (zIndex !== undefined) {
        this.zIndices.set(mapId, zIndex + 3)
      }
    }

    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  sendBackward(mapIds: Iterable<string>) {
    for (let [mapId, zIndex] of this.zIndices.entries()) {
      this.zIndices.set(mapId, zIndex * 2)
    }

    for (let mapId of mapIds) {
      const zIndex = this.zIndices.get(mapId)
      if (zIndex !== undefined) {
        this.zIndices.set(mapId, zIndex - 3)
      }
    }

    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
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
