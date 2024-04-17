import BaseRenderer from '../classes/BaseRenderer.js'
import CacheableImageDataTile from '../classes/CacheableImageDataTile.js'
import WarpedMapList from '../classes/WarpedMapList.js'
import Viewport from '../classes/Viewport.js'

import { renderToIntArray } from '../shared/render-to-int-array.js'
import type { Renderer } from '../shared/types.js'

import type { Size, FetchFn } from '@allmaps/types'

export default class CanvasRenderer
  extends BaseRenderer<ImageData>
  implements Renderer
{
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D

  constructor(
    canvas: HTMLCanvasElement,
    warpedMapList: WarpedMapList,
    fetchFn?: FetchFn
  ) {
    super(warpedMapList, CacheableImageDataTile.createFactory(), fetchFn)

    this.canvas = canvas
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D
  }

  async render(): Promise<void> {
    const width = this.canvas.width
    const height = this.canvas.height

    this.viewport = Viewport.fitWarpedMapList(this.warpedMapList, [
      width,
      height
    ])

    // TODO: this function loads too many info.jsons?? Some maps are outside of viewport.
    // Align with checkAndLoadImageInfos() (for WebGL2Renderer, where the renderer doesn't
    // have to wait untill all loaded).
    await Promise.allSettled(this.warpedMapList.loadAllImageInfo())

    this.updateRequestedTiles()

    await this.tileCache.waitUntilAllTilesLoaded()

    const imageData = new ImageData(width, height)

    await renderToIntArray(
      this.warpedMapList,
      this.tileCache,
      this.viewport,
      this.getTileImageData,
      this.getTileSize,
      imageData.data
    )

    this.context.putImageData(imageData, 0, 0)
  }

  private getTileImageData(data: ImageData, index: number): number {
    return data.data[index]
  }

  private getTileSize(data: ImageData): Size {
    return [data.width, data.height]
  }
}
