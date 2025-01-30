import BaseRenderer from './BaseRenderer.js'
import Viewport from '../viewport/Viewport.js'
import { createWarpedMapFactory } from '../maps/WarpedMap.js'
import CacheableIntArrayTile from '../tilecache/CacheableIntArrayTile.js'

import type {
  Renderer,
  GetImageData,
  GetImageDataValue,
  GetImageDataSize,
  IntArrayRendererOptions
} from '../shared/types.js'

import type WarpedMap from '../maps/WarpedMap.js'

import { renderToIntArray } from '../shared/render-to-int-array.js'

const CHANNELS = 4

/**
 * Class that renders WarpedMaps to an IntArray
 */
export default class IntArrayRenderer<D>
  extends BaseRenderer<WarpedMap, D>
  implements Renderer
{
  getImageDataValue: GetImageDataValue<D>
  getImageDataSize: GetImageDataSize<D>

  constructor(
    getImageData: GetImageData<D>,
    getImageDataValue: GetImageDataValue<D>,
    getImageDataSize: GetImageDataSize<D>,
    options?: Partial<IntArrayRendererOptions>
  ) {
    super(
      CacheableIntArrayTile.createFactory(getImageData),
      createWarpedMapFactory(),
      options
    )
    this.getImageDataValue = getImageDataValue
    this.getImageDataSize = getImageDataSize
  }

  async render(viewport: Viewport): Promise<Uint8ClampedArray> {
    this.viewport = viewport

    await Promise.allSettled(this.loadMissingImageInfosInViewport())

    this.requestFetchableTiles()
    await this.tileCache.allRequestedTilesLoaded()

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
