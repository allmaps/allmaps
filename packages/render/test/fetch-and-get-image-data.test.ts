import { afterEach, describe, expect, test, vi } from 'vitest'
import { expose, wrap } from 'comlink'

import { CacheableWorkerImageDataTile } from '../src/tilecache/CacheableWorkerImageDataTile.js'
import { WarpedMapEventType } from '../src/shared/events.js'
import { FetchableTile } from '../src/tilecache/FetchableTile.js'

import type { Tile } from '@allmaps/types'

import type { WorkerPool } from '../src/workers/PoolWorkers.js'
import type { FetchAndGetImageDataWorkerType } from '../src/workers/fetch-and-get-image-data.js'
import type { ApplySpritesImageDataWorkerType } from '../src/workers/apply-sprites-image-data.js'

const TILE_URL = 'https://example.com/tile.jpg'
const MAP_ID = 'map-1'

const TILE: Tile = {
  column: 0,
  row: 0,
  tileZoomLevel: {
    scaleFactor: 1,
    width: 256,
    height: 512,
    originalWidth: 256,
    originalHeight: 512,
    columns: 8,
    rows: 8
  },
  imageSize: [2048, 4096]
}

const IMAGE_DATA: ImageData = {
  colorSpace: 'srgb',
  data: new Uint8ClampedArray(4),
  width: 1,
  height: 1
}

/**
 * A tile talking to its worker across a real comlink boundary, over a
 * MessageChannel rather than a Worker. Real comlink is what makes the channel
 * count below meaningful: a `proxy()` argument is only turned into a
 * MessageChannel by comlink's own transfer handler, so a hand written double
 * would measure nothing.
 *
 * The worker's `getImageData` hangs until `finish` is called, so a test can act
 * while the tile is still fetching.
 */
function createTileOnRealComlink() {
  const calls: unknown[][] = []
  const aborted: string[] = []
  const released: number[] = []
  let finish: () => void = () => undefined
  let fail: (error: Error) => void = () => undefined

  const { port1, port2 } = new MessageChannel()
  expose(
    {
      async getImageData(...args: unknown[]) {
        calls.push(args)
        await new Promise<void>((resolve, reject) => {
          finish = resolve
          fail = reject
        })
        return IMAGE_DATA
      },
      abort(tileUrl: string) {
        aborted.push(tileUrl)
        finish()
      }
    },
    port1
  )
  const worker = wrap<FetchAndGetImageDataWorkerType>(port2)

  // `WorkerPool` keeps private fields, so a stand-in cannot satisfy it
  // structurally. Everything else here is the real type.
  const workerPool = {
    acquire: () => ({ worker, index: 0 }),
    release: (index: number) => released.push(index)
  } as unknown as WorkerPool<FetchAndGetImageDataWorkerType>

  const spritesWorker = wrap<ApplySpritesImageDataWorkerType>(
    new MessageChannel().port1
  )

  // No fetchFn: a function cannot be structured cloned, so passing one across
  // this boundary throws DataCloneError.
  const tile = new CacheableWorkerImageDataTile(
    new FetchableTile(TILE, MAP_ID, TILE_URL),
    workerPool,
    spritesWorker
  )

  return {
    tile,
    calls,
    aborted,
    released,
    finish: () => finish(),
    fail: (error: Error) => fail(error),
    close: () => {
      port1.close()
      port2.close()
    }
  }
}

/** Counts what comlink opens while `run` executes. */
async function countMessageChannels(run: () => Promise<void>) {
  const RealMessageChannel = globalThis.MessageChannel
  let opened = 0
  // stubGlobal so afterEach's unstubAllGlobals is the single restore mechanism.
  vi.stubGlobal(
    'MessageChannel',
    class extends RealMessageChannel {
      constructor() {
        super()
        opened++
      }
    }
  )

  await run()

  return opened
}

/** Waits for a comlink round trip and the handlers that follow it. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CacheableWorkerImageDataTile', () => {
  test('fetching a tile opens no MessageChannel', async () => {
    const { tile, finish, close } = createTileOnRealComlink()

    // comlink turns each `proxy()` argument into a MessageChannel whose port
    // stays exposed on this side until the worker's copy is garbage collected.
    // One per tile is what a panning user pays, so the only safe number is zero.
    const opened = await countMessageChannels(async () => {
      await tile.fetch()
      await settle()
      finish()
      await settle()
    })

    expect(opened).toBe(0)
    close()
  })

  test('sends the url, fetch function and tile size, in that order', async () => {
    const { tile, calls, finish, close } = createTileOnRealComlink()

    await tile.fetch()
    await settle()
    finish()
    await settle()

    expect(calls[0]).toEqual([TILE_URL, undefined, 256, 512])
    close()
  })

  test('aborting tells the worker to stop that fetch', async () => {
    const { tile, aborted, close } = createTileOnRealComlink()

    void tile.fetch()
    await settle()
    tile.abort()
    await settle()

    // The base class only trips a flag on this side. Cancelling for real means
    // the worker hearing about it.
    expect(aborted).toEqual([TILE_URL])
    close()
  })

  test('a failing fetch is reported, so the in-flight count comes back down', async () => {
    const { tile, fail, close } = createTileOnRealComlink()
    const errors: Event[] = []
    tile.addEventListener(WarpedMapEventType.TILEFETCHERROR, (event) =>
      errors.push(event)
    )

    void tile.fetch()
    await settle()
    fail(new Error('network down'))
    await settle()

    expect(errors).toHaveLength(1)
    close()
  })

  test('aborting after the fetch finished says nothing to the worker', async () => {
    const { tile, aborted, finish, close } = createTileOnRealComlink()

    void tile.fetch()
    await settle()
    finish()
    await settle()
    tile.abort()
    await settle()

    expect(aborted).toEqual([])
    close()
  })

  test('aborting twice sends one abort', async () => {
    const { tile, aborted, close } = createTileOnRealComlink()

    void tile.fetch()
    await settle()
    tile.abort()
    tile.abort()
    await settle()

    expect(aborted).toEqual([TILE_URL])
    close()
  })

  test('a response arriving after an abort is discarded', async () => {
    const { tile, finish, close } = createTileOnRealComlink()
    const fetched: Event[] = []
    tile.addEventListener(WarpedMapEventType.TILEFETCHED, (event) =>
      fetched.push(event)
    )

    void tile.fetch()
    await settle()
    tile.abort()
    finish()
    await settle()

    expect(fetched).toEqual([])
    expect(tile.isCachedTile()).toBe(false)
    close()
  })

  test('aborting opens no MessageChannel either', async () => {
    const { tile, close } = createTileOnRealComlink()

    const opened = await countMessageChannels(async () => {
      void tile.fetch()
      await settle()
      tile.abort()
      await settle()
    })

    expect(opened).toBe(0)
    close()
  })

  test('returns the worker to the pool', async () => {
    const { tile, released, finish, close } = createTileOnRealComlink()

    await tile.fetch()
    await settle()
    finish()
    await settle()

    expect(released).toEqual([0])
    close()
  })
})

/**
 * `expose` attaches to globalThis when the worker module is imported, and in
 * Node there is nothing to attach to, so the endpoint is stubbed before loading.
 */
async function importWorker() {
  vi.stubGlobal('addEventListener', () => undefined)
  vi.stubGlobal('removeEventListener', () => undefined)
  // Fresh module per test: its abortControllers map is what these tests probe.
  vi.resetModules()

  const { fetchAndGetImageDataWorker, abortControllers } =
    await import('../src/workers/fetch-and-get-image-data.js')

  return { worker: fetchAndGetImageDataWorker, abortControllers }
}

function stubImageDataBrowserApis() {
  const decoded = { closed: 0, drawn: 0, size: [0, 0] as [number, number] }

  vi.stubGlobal('createImageBitmap', async () => ({
    close: () => {
      decoded.closed++
    }
  }))
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(width: number, height: number) {
        decoded.size = [width, height]
      }
      getContext() {
        return {
          drawImage: () => {
            decoded.drawn++
          },
          getImageData: () => IMAGE_DATA
        }
      }
    }
  )

  return decoded
}

/** A fetch that never returns on its own, only when its signal is aborted. */
const hangUntilAborted = (_input: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted', 'AbortError'))
    )
  })

describe('fetch-and-get-image-data worker', () => {
  test('fetches the tile with the supplied fetch function', async () => {
    const { worker } = await importWorker()
    const seen: unknown[] = []

    const decoded = stubImageDataBrowserApis()

    await worker.getImageData(
      TILE_URL,
      async (input) => {
        seen.push(input)
        return new Response(new Blob())
      },
      2,
      3
    )

    expect(seen).toEqual([TILE_URL])
    expect(decoded.size).toEqual([2, 3])
  })

  test('abort stops a fetch that is still running', async () => {
    const { worker } = await importWorker()
    stubImageDataBrowserApis()

    const fetching = worker.getImageData(TILE_URL, hangUntilAborted, 1, 1)
    worker.abort(TILE_URL)

    await expect(fetching).rejects.toThrow(/aborted/i)
  })

  test('a second fetch for the same url stays abortable', async () => {
    const { worker } = await importWorker()
    stubImageDataBrowserApis()

    let releaseFirst: () => void = () => undefined
    const firstFetch = () =>
      new Promise<Response>((resolve) => {
        releaseFirst = () => resolve(new Response(new Blob()))
      })

    const first = worker.getImageData(TILE_URL, firstFetch, 1, 1)
    const second = worker.getImageData(TILE_URL, hangUntilAborted, 1, 1)

    releaseFirst()
    await first

    worker.abort(TILE_URL)

    await expect(second).rejects.toThrow(/abort/i)
  })

  test('the registry empties once a fetch settles', async () => {
    const { worker, abortControllers } = await importWorker()
    stubImageDataBrowserApis()

    await worker.getImageData(
      TILE_URL,
      async () => new Response(new Blob()),
      2,
      3
    )
    expect(abortControllers.size).toBe(0)

    // and after a failure, not only after a success
    await expect(
      worker.getImageData(
        TILE_URL,
        async () => {
          throw new Error('network down')
        },
        2,
        3
      )
    ).rejects.toThrow()
    expect(abortControllers.size).toBe(0)
  })

  test('aborting while the body is read stops before decoding', async () => {
    const { worker } = await importWorker()
    const decoded = stubImageDataBrowserApis()
    let releaseBody: () => void = () => undefined
    const response = {
      ok: true,
      blob: () =>
        new Promise((resolve) => {
          releaseBody = () => resolve(new Blob())
        })
    } as unknown as Response

    const fetching = worker.getImageData(TILE_URL, async () => response, 1, 1)
    await settle()
    worker.abort(TILE_URL)
    releaseBody()

    await expect(fetching).rejects.toThrow(/abort/i)
    expect(decoded.closed).toBe(0)
    expect(decoded.drawn).toBe(0)
  })

  test('aborting while decoding stops before the copy and frees the bitmap', async () => {
    const { worker } = await importWorker()
    const decoded = stubImageDataBrowserApis()
    let releaseDecode: () => void = () => undefined
    vi.stubGlobal(
      'createImageBitmap',
      () =>
        new Promise((resolve) => {
          releaseDecode = () =>
            resolve({
              close: () => {
                decoded.closed++
              }
            })
        })
    )

    const fetching = worker.getImageData(
      TILE_URL,
      async () => new Response(new Blob()),
      1,
      1
    )
    await settle()
    worker.abort(TILE_URL)
    releaseDecode()

    await expect(fetching).rejects.toThrow(/abort/i)
    expect(decoded.drawn).toBe(0)
    expect(decoded.closed).toBe(1)
  })

  test('propagates a failing fetch', async () => {
    const { worker } = await importWorker()
    stubImageDataBrowserApis()

    await expect(
      worker.getImageData(
        TILE_URL,
        async () => {
          throw new Error('network down')
        },
        1,
        1
      )
    ).rejects.toThrow()
  })
})
