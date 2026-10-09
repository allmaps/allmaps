import { describe, expect, test } from 'vitest'

import { TileCache } from '../src/tilecache/TileCache.js'
import { CacheableTile } from '../src/tilecache/CacheableTile.js'
import { FetchableTile } from '../src/tilecache/FetchableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../src/shared/events.js'

import type { Tile } from '@allmaps/types'

const TILE_URL = 'https://example.com/tile.jpg'
const MAP_ID = 'map-1'

const TILE: Tile = {
  column: 0,
  row: 0,
  tileZoomLevel: {
    scaleFactor: 1,
    width: 256,
    height: 256,
    originalWidth: 256,
    originalHeight: 256,
    columns: 4,
    rows: 4
  },
  imageSize: [1024, 1024]
}

/** A tile that fetches nothing, so a test can decide how it ends. */
class ControllableTile extends CacheableTile<string> {
  aborted = false

  async fetch() {
    return this.data
  }

  override abort() {
    this.aborted = true
    super.abort()
  }

  succeed() {
    this.data = 'pixels'
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, {
        tileUrl: this.fetchableTile.tileUrl
      })
    )
  }

  fail() {
    this.dispatchTileFetchError(new Error('network down'))
  }

  // Sprites take no part in the accounting under test.
  async applySprites() {}
  spritesDataToCachedTiles() {
    return []
  }
}

function createCache() {
  const tiles = new Map<string, ControllableTile>()

  const cache = new TileCache<string>((fetchableTile) => {
    const tile = new ControllableTile(fetchableTile)
    tiles.set(fetchableTile.tileUrl, tile)
    return tile
  })

  const allLoaded: Event[] = []
  const loading: Event[] = []
  const errors: Event[] = []
  cache.addEventListener(WarpedMapEventType.ALLREQUESTEDTILESLOADED, (event) =>
    allLoaded.push(event)
  )
  cache.addEventListener(WarpedMapEventType.REQUESTEDTILESLOADING, (event) =>
    loading.push(event)
  )
  cache.addEventListener(WarpedMapEventType.TILEFETCHERROR, (event) =>
    errors.push(event)
  )

  const request = (...tileUrls: string[]) =>
    cache.requestFetchableTiles(
      (tileUrls.length ? tileUrls : [TILE_URL]).map(
        (tileUrl) => new FetchableTile(TILE, MAP_ID, tileUrl)
      )
    )

  return {
    cache,
    request,
    allLoaded,
    loading,
    errors,
    getTile: (tileUrl = TILE_URL) => {
      const tile = tiles.get(tileUrl)

      // Throw rather than return undefined: a test that asserts nothing
      // happened would otherwise pass by doing nothing.
      if (!tile) {
        throw new Error(`no tile was created for ${tileUrl}`)
      }

      return tile
    }
  }
}

describe('TileCache', () => {
  test('a failed tile that is then pruned leaves the count at zero', () => {
    const { cache, request, allLoaded, getTile } = createCache()

    request()
    getTile().fail()
    // Pruning with no info removes it: it is neither cached nor fetching now.
    cache.prune(new Map())

    // Counting it out twice leaves -1, and a negative count never reads as
    // finished, so the next tile to arrive would announce "all loaded".
    expect(cache.finished).toBe(true)
    expect(allLoaded).toHaveLength(1)
  })

  test('the count returns to zero when a tile succeeds', () => {
    const { cache, request, allLoaded, getTile } = createCache()

    request()
    expect(cache.finished).toBe(false)

    getTile().succeed()

    expect(cache.finished).toBe(true)
    expect(allLoaded).toHaveLength(1)
  })

  test('announces loading once for a batch, and all loaded when the last lands', () => {
    const { request, allLoaded, loading, getTile } = createCache()
    const second = 'https://example.com/tile-2.jpg'

    request(TILE_URL, second)

    expect(loading).toHaveLength(1)
    expect(allLoaded).toHaveLength(0)

    getTile(TILE_URL).succeed()
    expect(allLoaded).toHaveLength(0)

    getTile(second).succeed()
    expect(allLoaded).toHaveLength(1)
    expect(loading).toHaveLength(1)
  })

  test('clear announces nothing', () => {
    const { cache, request, allLoaded, loading } = createCache()

    request()
    const before = { allLoaded: allLoaded.length, loading: loading.length }
    cache.clear()

    expect(allLoaded).toHaveLength(before.allLoaded)
    expect(loading).toHaveLength(before.loading)
    expect(cache.finished).toBe(true)
  })

  test('a removed tile that fails later is not reported', () => {
    const { cache, request, errors, getTile } = createCache()

    request()
    const tile = getTile()
    cache.prune(new Map())
    tile.fail()

    // Nobody wants this tile anymore, so its failure is not news.
    expect(errors).toEqual([])
  })

  test('waiting for all tiles resolves when the last one lands', async () => {
    const { cache, request, getTile } = createCache()

    request()
    let settled = false
    const waiting = cache.allRequestedTilesLoaded().then(() => {
      settled = true
    })

    expect(settled).toBe(false)
    getTile().succeed()
    await waiting

    expect(settled).toBe(true)
  })

  test('waiting for all tiles rejects when the cache is cleared', async () => {
    const { cache, request } = createCache()

    request()
    const waiting = cache.allRequestedTilesLoaded()

    cache.clear()

    // Resolving would tell the caller its tiles are ready to draw, and it
    // would render the nothing that is left.
    await expect(waiting).rejects.toThrow(/cleared/i)
  })

  test('a tile pruned while still fetching is counted out and aborted', () => {
    const { cache, request, getTile } = createCache()

    request()
    const tile = getTile()
    expect(cache.finished).toBe(false)

    cache.prune(new Map())

    expect(cache.finished).toBe(true)
    expect(tile.aborted).toBe(true)
  })
})
