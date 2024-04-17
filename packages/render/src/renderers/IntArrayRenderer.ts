import BaseRenderer from '../classes/BaseRenderer.js'
import WarpedMapList from '../classes/WarpedMapList.js'
import Viewport from '../classes/Viewport.js'
import CacheableIntArrayTile from '../classes/CacheableIntArrayTile.js'

import type {
  Renderer,
  GetImageData,
  GetImageDataValue,
  GetImageDataSize
} from '../shared/types.js'

import { renderToIntArray } from '../shared/render-to-int-array.js'

import type { FetchFn } from '@allmaps/types'

const CHANNELS = 4

export default class IntArrayRenderer<T>
  extends BaseRenderer<T>
  implements Renderer
{
  getImageDataValue: GetImageDataValue<T>
  getImageDataSize: GetImageDataSize<T>

  constructor(
    warpedMapList: WarpedMapList,
    getImageData: GetImageData<T>,
    getImageDataValue: GetImageDataValue<T>,
    getImageDataSize: GetImageDataSize<T>,
    fetchFn?: FetchFn
  ) {
    super(
      warpedMapList,
      CacheableIntArrayTile.createFactory(getImageData),
      fetchFn
    )
    this.getImageDataValue = getImageDataValue
    this.getImageDataSize = getImageDataSize
  }

  async render(viewport: Viewport): Promise<Uint8ClampedArray> {
    this.viewport = viewport
    await Promise.allSettled(this.warpedMapList.loadAllImageInfo())

    this.updateRequestedTiles()

    await this.tileCache.waitUntilAllTilesLoaded()

    const intArray = new Uint8ClampedArray(
      viewport.viewportSize[0] * viewport.viewportSize[1] * CHANNELS
    )

    await renderToIntArray(
      this.warpedMapList,
      this.tileCache,
      this.viewport,
      this.getImageDataValue,
      this.getImageDataSize,
      intArray
    )

    return intArray
  }
}
