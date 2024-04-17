import TileCache from '../tilecache/TileCache.js'
import WarpedMapList from '../maps/WarpedMapList.js'
import FetchableMapTile from '../tilecache/FetchableTile.js'

import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import {
  geoBboxToResourceRing,
  getBestTileZoomLevelForScale,
  computeTilesCoveringRingAtTileZoomLevel
} from '../shared/tiles.js'

import { distance, bboxToDiameter, bboxToCenter } from '@allmaps/stdlib'

import type Viewport from '../Viewport.js'
import type WarpedMap from '../maps/WarpedMap.js'
import type {
  CachableTileFactory,
  WarpedMapFactory,
  RendererOptions
} from '../shared/types.js'

const MIN_VIEWPORT_DIAMETER = 5

export default abstract class BaseRenderer<
  W extends WarpedMap,
  D
> extends EventTarget {
  warpedMapList: WarpedMapList<W>
  tileCache: TileCache<D>

  mapsInViewport: Set<string> = new Set()
  protected viewport: Viewport | undefined

  constructor(
    cachableTileFactory: CachableTileFactory<D>,
    warpedMapFactory: WarpedMapFactory<W>,
    options?: Partial<RendererOptions>
  ) {
    super()

    this.tileCache = new TileCache(cachableTileFactory, options)
    this.warpedMapList = new WarpedMapList(warpedMapFactory, options)
  }

  async addGeoreferenceAnnotation(annotation: unknown) {
    return this.warpedMapList.addGeoreferenceAnnotation(annotation)
  }

  async addGeoreferencedMap(georeferencedMap: unknown) {
    return this.warpedMapList.addGeoreferencedMap(georeferencedMap)
  }

  // addMap

  protected shouldUpdateRequestedTiles() {
    return true
  }

  protected updateRequestedTiles(): void {
    if (!this.viewport) {
      return
    }

    const viewport = this.viewport

    if (!this.shouldUpdateRequestedTiles()) {
      return
    }

    const possibleMapsInViewport = Array.from(
      this.warpedMapList.getMapsByGeoBbox(this.viewport.geoRectangleBbox)
    ).sort((mapIdA, mapIdB) => {
      const warpedMapA = this.warpedMapList.getWarpedMap(mapIdA)
      const warpedMapB = this.warpedMapList.getWarpedMap(mapIdB)
      if (warpedMapA && warpedMapB) {
        return (
          distance(bboxToCenter(warpedMapA.geoMaskBbox), viewport.geoCenter) -
          distance(bboxToCenter(warpedMapB.geoMaskBbox), viewport.geoCenter)
        )
      } else {
        return 0
      }
    })

    const requestedTiles: FetchableMapTile[] = []
    for (const mapId of possibleMapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      if (!warpedMap.visible) {
        continue
      }

      if (!warpedMap.hasImageInfo()) {
        // Note: don't load image info here
        // this would imply waiting for the first throttling cycle to complete
        // before acting on a sucessful load
        continue
      }

      // Only draw maps that are larger than MIN_VIEWPORT_DIAMETER pixels are returned
      // Note that diameter is equivalent to geometryToDiameter(warpedMap.projectedGeoMask) / this.viewport.projectedGeoPerViewportScale
      if (
        bboxToDiameter(warpedMap.getViewportMaskBbox(viewport)) <
        MIN_VIEWPORT_DIAMETER
      ) {
        continue
      }

      // Note the equivalence of the following two:
      // - warpedMap.getApproxResourceToCanvasScale(this.viewport)
      // - warpedMap.resourceToProjectedGeoScale * this.viewport.projectedGeoPerCanvasScale
      const tileZoomLevel = getBestTileZoomLevelForScale(
        warpedMap.parsedImage,
        warpedMap.getResourceToCanvasScale(viewport)
      )

      warpedMap.setBestScaleFactor(tileZoomLevel.scaleFactor)

      // Transforming the viewport back to resource
      const projectedTransformerOptions = {
        // This can be expensive at high maxDepth and seems to work fine with maxDepth = 0
        maxDepth: 0
      }

      const resourceViewportRing = geoBboxToResourceRing(
        warpedMap.projectedTransformer,
        viewport.projectedGeoRectangleBbox,
        projectedTransformerOptions
      )

      warpedMap.setResourceViewportRing(resourceViewportRing)

      // This returns tiles sorted by distance from center of resourceViewportRing
      const tiles = computeTilesCoveringRingAtTileZoomLevel(
        resourceViewportRing,
        tileZoomLevel,
        warpedMap.parsedImage
      )

      for (const tile of tiles) {
        requestedTiles.push(new FetchableMapTile(tile, warpedMap))
      }
    }

    this.tileCache.requestFetchableMapTiles(requestedTiles)
    this.updateMapsInViewport(requestedTiles)
  }

  protected updateMapsInViewport(tiles: FetchableMapTile[]) {
    // TODO: handle everything as Set() once JS supports filter on sets.
    // And speed up with anonymous functions with the Set.prototype.difference() once broadly supported
    const oldMapsInViewportAsArray = Array.from(this.mapsInViewport)
    const newMapsInViewportAsArray = tiles
      .map((tile) => tile.mapId)
      .filter((v, i, a) => {
        // filter out duplicate mapIds
        return a.indexOf(v) === i
      })

    this.mapsInViewport = new Set(
      newMapsInViewportAsArray.sort((mapIdA, mapIdB) => {
        const zIndexA = this.warpedMapList.getMapZIndex(mapIdA)
        const zIndexB = this.warpedMapList.getMapZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }
        return 0
      })
    )

    const enteringMapsInViewport = newMapsInViewportAsArray.filter(
      (mapId) => !oldMapsInViewportAsArray.includes(mapId)
    )
    const leavingMapsInViewport = oldMapsInViewportAsArray.filter(
      (mapId) => !newMapsInViewportAsArray.includes(mapId)
    )

    for (const mapId in enteringMapsInViewport) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTER, mapId)
      )
    }
    for (const mapId in leavingMapsInViewport) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEAVE, mapId)
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected mapTileLoaded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected mapTileRemoved(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected imageInfoLoaded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected warpedMapAdded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected warpedMapRemoved(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected transformationChanged(event: Event): void {}

  protected addEventListeners() {
    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILEREMOVED,
      this.mapTileRemoved.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.warpedMapRemoved.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )
  }

  protected removeEventListeners() {
    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILEREMOVED,
      this.mapTileRemoved.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.warpedMapRemoved.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )
  }
}
