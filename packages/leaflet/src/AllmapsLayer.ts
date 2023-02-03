import { DomUtil, GridLayer } from 'leaflet'

import {
  TileCache,
  RTree,
  World,
  Viewport,
  xyzTileToLonLatBBox,
  fromLonLat,
  CanvasRenderer
} from '@allmaps/render'

import type { BBox, XYZTile, NeededTile, WarpedMapEvent } from '@allmaps/render'

// TODO: good name?
// type AllmapsLayer = {
//   rtree: RTree
//   tileCache: TileCache
//   world: World

//   tileUrlCount: Map<string, number>
//   tileUrlsPerKey: Map<string, Set<string>>

//   on: (type: string, callback: Function) => void
//   initialize: (options: any) => void
//   _tileCoordsToKey: (coords: XYZ) => string
//   createTile: (coords: XYZ, done: Function) => HTMLElement
//   getTileSize: () => { x: number; y: number }

//   addGeorefAnnotation: (annotation: any) => void
// }

export default GridLayer.extend({
  keys: new Set(),
  tileUrlCount: new Map(),
  tileUrlsPerKey: new Map(),
  keysPerUrl: new Map(),

  canvasRendererPerKey: new Map(),

  initialize(options: any) {
    this.rtree = new RTree()
    this.world = new World(this.rtree)
    this.viewport = new Viewport(this.world)

    this.tileCache = new TileCache()

    this.world.addEventListener('georefannotationadded', (event: WarpedMapEvent) => {
      console.log('georefannotationadded', this.keys)
      for (let key of this.keys) {
        this.renderTile(key)
      }

    })

    this.tileCache.addEventListener('tileloaded', (event: WarpedMapEvent) => {
      const url = event.data
      const keys = this.keysPerUrl.get(url)
      console.log('tileloaded', url, keys)
      if (keys) {
        for (let key of keys) {
          this.renderTile(key)
        }
      }
    })

    this.on(
      'tileunload',
      ({ tile, coords }: { tile: HTMLElement; coords: XYZTile }) => {
        const key = this._tileCoordsToKey(coords)
        this.canvasRendererPerKey.delete(key)

        const tileUrls = this.tileUrlsPerKey.get(key)

        if (tileUrls) {
          for (let url of tileUrls) {
            this.removeTile(key, url)
          }
        }
      }
    )
  },

  async addGeorefAnnotation(annotation: any) {
    await this.world.addGeorefAnnotation(annotation)
  },

  // TODO: rename to addIIIFTile?!
  async addTile(key: string, tile: NeededTile) {
    await this.tileCache.addTile(tile)

    const count = this.tileUrlCount.get(tile.url)

    if (count === undefined) {
      this.tileUrlCount.set(tile.url, 1)
    } else {
      this.tileUrlCount.set(tile.url, count + 1)
    }

    const tileUrlsForKey = this.tileUrlsPerKey.get(key)

    if (!tileUrlsForKey) {
      this.tileUrlsPerKey.set(key, new Set([tile.url]))
    } else {
      tileUrlsForKey.add(tile.url)

      // TODO: is this needed?
      this.tileUrlsPerKey.set(key, tileUrlsForKey)
    }

    const keysForUrl = this.keysPerUrl.get(tile.url)
    if (!keysForUrl) {
      this.keysPerUrl.set(tile.url, new Set([key]))
    } else {
      keysForUrl.add(key)

      // TODO: is this needed?
      this.keysPerUrl.set(tile.url, keysForUrl)
    }
  },

  removeTile(key: string, url: string) {
    const count = this.tileUrlCount.get(url)

    if (!count) {
      return
    }

    this.keys.delete(key)
    this.tileCache.removeTile(url)

    if (count === 1) {
      this.tileUrlCount.delete(url)
    } else if (count > 1) {
      this.tileUrlCount.set(url, count - 1)
    }

    const tileUrlsForKey = this.tileUrlsPerKey.get(key)

    if (tileUrlsForKey) {
      tileUrlsForKey.delete(key)

      if (tileUrlsForKey.size === 0) {
        this.tileUrlsPerKey.delete(key)
      } else {
        // TODO: is this needed?
        this.tileUrlsPerKey.set(key, tileUrlsForKey)
      }
    }

    const keysForUrl = this.keysPerUrl.get(url)

    if (keysForUrl) {
      keysForUrl.delete(url)

      if (keysForUrl.size === 0) {
        this.keysPerUrl.delete(url)
      } else {
        // TODO: is this needed?
        this.keysPerUrl.set(url, keysForUrl)
      }
    }
  },

  geoBBoxFromCoords(coords: XYZTile) {
    const latLongBBox = xyzTileToLonLatBBox(coords)
    const northWest = fromLonLat([latLongBBox[0], latLongBBox[1]])
    const southEast = fromLonLat([latLongBBox[2], latLongBBox[3]])

    const geoBBox: BBox = [
      northWest[0],
      southEast[1],
      southEast[0],
      northWest[1]
    ]

    return geoBBox
  },

  renderTile(
    key: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const coords = this._keyToTileCoords(key)
      const geoBBox = this.geoBBoxFromCoords(coords)
      const canvasRenderer = this.canvasRendererPerKey.get(key)

      if (!canvasRenderer) {
        return
      }

      const width = canvasRenderer.width
      const height = canvasRenderer.height

      const tilesNeeded = this.viewport.updateViewportAndGetTilesNeeded([width, height], geoBBox)

      for (let tile of tilesNeeded) {
        await this.addTile(key, tile)
      }

      canvasRenderer.render(geoBBox)
      // canvasRenderer.makeRed()


      resolve()
    })
  },

  createTile(coords: XYZTile, done: Function) {
    const key = this._tileCoordsToKey(coords)
    this.keys.add(key)

    const canvas = DomUtil.create('canvas', 'leaflet-tile')

    canvas.style.visibility = 'visible'

    const size = this.getTileSize()
    canvas.width = size.x * devicePixelRatio
    canvas.height = size.y * devicePixelRatio

    console.log('createTile', coords)

    const canvasRenderer = new CanvasRenderer(
      canvas,
      this.world,
      this.tileCache
    )
    this.canvasRendererPerKey.set(key, canvasRenderer)

    this.renderTile(key)

    this.renderTile(key).then(() => {
      done(null, canvas)
    })


    // done(null, canvas)

    return canvas
  }
})
