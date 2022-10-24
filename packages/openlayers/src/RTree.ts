// Move to @allmaps/render?!

// TODO: consider using
// https://github.com/mourner/flatbush
import RBush from 'rbush'
import earcut from 'earcut'

import { fromLonLat } from 'ol/proj.js'
import { apply as applyTransform } from 'ol/transform.js'

import { computeIiifTilesForMapExtent } from '@allmaps/render'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import {
  createTransformer,
  svgPolygonToGeoJSONPolygon
} from '@allmaps/transform'

import { WarpedMap } from './WarpedMap.js'
import { WarpedMapEventTypes } from './WarpedMapEventType.js'

import type { TileZoomLevel, ImageRequest } from '@allmaps/iiif-parser'
import type { Map as Georef } from '@allmaps/annotation'

// TODO: import types from other file
type Size = [number, number]
type Extent = [number, number, number, number]

type Tile = {
  column: number
  row: number
  zoomLevel: TileZoomLevel
}

type NeededTile = {
  tile: Tile
  imageRequest: ImageRequest
  url: string
}

type Coord = [number, number]
type Polygon = {
  type: string
  coordinates: Coord[][]
}

interface WarpedMapsRtreeItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  mapId: string
}

export class RTree extends EventTarget {
  neededTilesByMap: Map<string, Map<string, NeededTile>> = new Map()
  warpedMaps: Map<string, WarpedMap> = new Map()
  warpedMapsRtree: RBush<WarpedMapsRtreeItem> = new RBush()
  extent: Extent = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  ]

  getGeoMaskExtent(geoMask: Polygon): Extent {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    geoMask.coordinates[0].forEach((coordinate: Coord) => {
      minX = Math.min(minX, coordinate[0])
      minY = Math.min(minY, coordinate[1])
      maxX = Math.max(maxX, coordinate[0])
      maxY = Math.max(maxY, coordinate[1])
    })

    return [minX, minY, maxX, maxY]
  }

  sendSourceMessage(type: string, data: any) {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: data
      })
    )
    // this.dispatchEvent(new RTreeEvent(type, data))
  }

  updateNeededTiles(
    mapId: string,
    image: IIIFImage,
    iiifTilesForMapExtent: Tile[]
  ) {
    const updatedNeededTilesForMap: Map<string, NeededTile> = new Map()
    const updatedNeededTileUrlsForMap: Set<string> = new Set()

    iiifTilesForMapExtent.forEach((tile: Tile) => {
      const imageRequest = image.getIiifTile(
        tile.zoomLevel,
        tile.column,
        tile.row
      )
      const url = image.getImageUrl(imageRequest)

      updatedNeededTilesForMap.set(url, {
        tile,
        imageRequest,
        url
      })

      updatedNeededTileUrlsForMap.add(url)
    })

    if (!this.neededTilesByMap.has(mapId)) {
      this.neededTilesByMap.set(mapId, new Map())
      this.sendSourceMessage(WarpedMapEventTypes.WARPEDMAPENTEREXTENT, {
        mapId
      })
    }

    const currentNeededTilesForMap = this.neededTilesByMap.get(mapId)

    // TODO: is this correct? Added to fix TypeScript errors
    if (currentNeededTilesForMap) {
      let tilesAdded: string[] = [...updatedNeededTileUrlsForMap].filter(
        (url) => !currentNeededTilesForMap.has(url)
      )

      let tilesRemoved: string[] = [...currentNeededTilesForMap.keys()].filter(
        (url) => !updatedNeededTileUrlsForMap.has(url)
      )

      if (tilesAdded.length) {
        tilesAdded.forEach((url: string) => {
          const neededTile = updatedNeededTilesForMap.get(url)

          if (neededTile) {
            this.sendSourceMessage(WarpedMapEventTypes.TILENEEDED, {
              mapId,
              ...neededTile
            })

            currentNeededTilesForMap.set(url, neededTile)
          }
        })
      }

      if (tilesRemoved.length) {
        tilesRemoved.forEach((url) => {
          this.sendSourceMessage(WarpedMapEventTypes.TILEUNNEEDED, {
            mapId,
            url
          })

          currentNeededTilesForMap.delete(url)

          if (currentNeededTilesForMap.size === 0) {
            this.neededTilesByMap.delete(mapId)

            this.sendSourceMessage(WarpedMapEventTypes.WARPEDMAPLEAVEEXTENT, {
              mapId
            })
          }
        })
      }
    }
  }

  async addMap(mapId: string, map: Georef) {
    const imageUri = map.image.uri

    const gcps = map.gcps

    const sphericalMercatorGcps = gcps.map(({ world, image }) => ({
      world: fromLonLat(world),
      image
    })) as [{ world: Coord; image: Coord }]

    const transformer = createTransformer(sphericalMercatorGcps)

    const geoMask = svgPolygonToGeoJSONPolygon(transformer, map.pixelMask)

    const geoMaskExtent = this.getGeoMaskExtent(geoMask)

    this.extent[0] = Math.min(this.extent[0], geoMaskExtent[0])
    this.extent[1] = Math.min(this.extent[1], geoMaskExtent[1])
    this.extent[2] = Math.max(this.extent[2], geoMaskExtent[2])
    this.extent[3] = Math.max(this.extent[3], geoMaskExtent[3])

    const iiifData = await fetch(`${imageUri}/info.json`).then((response) =>
      response.json()
    )
    const image = IIIFImage.parse(iiifData)

    // TODO: to make sure only tiles for visible parts of the map are requested
    // (and not for parts hidden behind maps on top of it)
    // use https://github.com/mfogel/polygon-clipping to subtract geoMasks of
    // maps that have been added before.
    // Map A (topmost): show completely
    // Map B: B - A
    // Map C: C - B - A
    // Map D: D - C - B - A

    const flattened = earcut.flatten(geoMask.coordinates)
    const vertexIndices = earcut(
      flattened.vertices,
      flattened.holes,
      flattened.dimensions
    )
    const triangles = vertexIndices
      .map((index) => [
        flattened.vertices[index * 2],
        flattened.vertices[index * 2 + 1]
      ])
      .flat()

    const warpedMap = new WarpedMap(
      mapId,
      map,
      image,
      transformer,
      geoMask,
      geoMaskExtent,
      triangles
    )

    this.warpedMaps.set(mapId, warpedMap)

    const item = {
      minX: warpedMap.geoMaskExtent[0],
      minY: warpedMap.geoMaskExtent[1],
      maxX: warpedMap.geoMaskExtent[2],
      maxY: warpedMap.geoMaskExtent[3],
      mapId
    }

    this.warpedMapsRtree.insert(item)

    this.sendSourceMessage(WarpedMapEventTypes.WARPEDMAPADDED, {
      mapId,
      image,
      transformer,
      triangles
    })
  }

  setViewport(
    size: Size,
    extent: Extent,
    coordinateToPixelTransform: number[]
  ) {
    const [minX, minY, maxX, maxY] = extent

    const rtreeResults = this.warpedMapsRtree.search({
      minX,
      minY,
      maxX,
      maxY
    })

    const possiblyUnneededMaps = new Set(this.neededTilesByMap.keys())

    if (rtreeResults.length) {
      for (let { mapId } of rtreeResults) {
        const warpedMap = this.warpedMaps.get(mapId)

        if (!warpedMap) {
          continue
        }

        const topLeft = [warpedMap.geoMaskExtent[0], warpedMap.geoMaskExtent[1]]
        const bottomRight = [
          warpedMap.geoMaskExtent[2],
          warpedMap.geoMaskExtent[3]
        ]

        const pixelTopLeft = applyTransform(coordinateToPixelTransform, topLeft)
        const pixelBottomRight = applyTransform(
          coordinateToPixelTransform,
          bottomRight
        )

        const pixelWidth = Math.abs(pixelBottomRight[0] - pixelTopLeft[0])
        const pixelHeight = Math.abs(pixelTopLeft[1] - pixelBottomRight[1])

        // Only draw maps that are larger than 1 pixel in combined width and height
        // TODO: use constant instead of 1
        if (pixelWidth + pixelHeight < 1) {
          continue
        }

        const transformer = warpedMap.transformer
        const image = warpedMap.image
        const iiifTilesForMapExtent = computeIiifTilesForMapExtent(
          transformer,
          image,
          size,
          extent
        )

        this.updateNeededTiles(mapId, image, iiifTilesForMapExtent)
        possiblyUnneededMaps.delete(mapId)
      }
    }

    for (let mapId of possiblyUnneededMaps) {
      const neededTilesForMap = this.neededTilesByMap.get(mapId)

      if (neededTilesForMap) {
        for (let url of neededTilesForMap.keys()) {
          this.sendSourceMessage(WarpedMapEventTypes.TILEUNNEEDED, {
            mapId,
            url
          })
        }
      }

      this.neededTilesByMap.delete(mapId)
      this.sendSourceMessage(WarpedMapEventTypes.WARPEDMAPLEAVEEXTENT, {
        mapId
      })
    }
  }

  getExtent(): Extent | undefined {
    return this.extent
  }

  // To remove data from RBush, see
  // https://github.com/mourner/rbush#removing-data
}
