import Source from 'ol/source/Source.js'

import { generateChecksum } from '@allmaps/id/browser'
import { parseAnnotation  } from '@allmaps/annotation'

import { OLCustomEvent } from './OLCustomEvent.js'
import { WarpedMapEventTypes } from './WarpedMapEventType.js'
import { RTree } from './RTree.js'

type Size = [number, number]
type Extent = [number, number, number, number]

export class WarpedMapSource extends Source {
  rtree: RTree

  tileUrls: Set<string> = new Set()

  constructor() {
    super({
      interpolate: true,
      projection: undefined,
      state: 'ready',
      wrapX: true
    })

    this.rtree = new RTree()

    // WARPEDMAPADDED
    this.rtree.addEventListener(WarpedMapEventTypes.WARPEDMAPADDED, ((
      event
    ) => {
      this.dispatchEvent(event as unknown as OLCustomEvent)
      this.changed()
    }) as EventListener)

    // WARPEDMAPENTEREXTENT
    this.rtree.addEventListener(WarpedMapEventTypes.WARPEDMAPENTEREXTENT, ((
      event
    ) => {
      this.dispatchEvent(event as unknown as OLCustomEvent)
    }) as EventListener)

    // WARPEDMAPLEAVEEXTENT
    this.rtree.addEventListener(WarpedMapEventTypes.WARPEDMAPLEAVEEXTENT, ((
      event: CustomEvent
    ) => {
      this.dispatchEvent(event as unknown as OLCustomEvent)
    }) as EventListener)

    // TILENEEDED
    this.rtree.addEventListener(WarpedMapEventTypes.TILENEEDED, ((
      event: CustomEvent
    ) => {
      this.dispatchEvent(event as unknown as OLCustomEvent)

      const { url } = event.detail
      this.tileUrls.add(url)

      this.dispatchEvent(
        new OLCustomEvent(WarpedMapEventTypes.TILESCHANGED, {
          detail: [...this.tileUrls]
        })
      )
    }) as EventListener)

    // TILEUNNEEDED
    this.rtree.addEventListener(WarpedMapEventTypes.TILEUNNEEDED, ((
      event: CustomEvent
    ) => {
      this.dispatchEvent(event as unknown as OLCustomEvent)

      const { url } = event.detail
      this.tileUrls.delete(url)

      this.dispatchEvent(
        new OLCustomEvent(WarpedMapEventTypes.TILESCHANGED, {
          detail: [...this.tileUrls]
        })
      )
    }) as EventListener)
  }

  updateNeededTiles(
    size: Size,
    extent: Extent,
    coordinateToPixelTransform: number[]
  ) {
    // TODO: rename function this.updateNeededTiles and/or rtree.setViewport
    this.rtree.setViewport(size, extent, coordinateToPixelTransform)
  }

  async addGeorefAnnotation(annotation: any) {
    const maps = parseAnnotation(annotation)
    for (let map of maps) {
      const mapId = map.id || (await generateChecksum(map))
      await this.rtree.addMap(mapId, map)
    }
  }

  getExtent(): Extent | undefined {
    return this.rtree.getExtent()
  }
}
