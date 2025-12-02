import { expose, transfer } from 'comlink'

import type { Size } from '@allmaps/types'

import type { Sprite } from '../shared/types'

const ApplySpritesImageDataWorker = {
  async applySprites(
    imageData: ImageData,
    sprites: Sprite[],
    tileSizesByResourceId: Map<string, Size[]>
  ): Promise<ImageData[]> {
    const clippedImageDatas: ImageData[] = []
    for (const sprite of sprites) {
      const tileSizes = tileSizesByResourceId.get(sprite.imageId)
      if (!tileSizes) {
        break
      }
      for (const tileSize of tileSizes) {
        const clippedImageData = new ImageData(...tileSize)

        for (let y = 0; y < sprite.height; y++) {
          const srcStartIndex =
            ((sprite.y + y) * imageData.width + sprite.x) * 4
          const destStartIndex = y * tileSize[0] * 4
          const rowLength = sprite.width * 4

          clippedImageData.data.set(
            imageData.data.subarray(srcStartIndex, srcStartIndex + rowLength),
            destStartIndex
          )
        }
        clippedImageDatas.push(clippedImageData)
      }
    }

    return transfer(
      clippedImageDatas,
      clippedImageDatas.map((clippedImageData) => clippedImageData.data.buffer)
    )
  }
}

expose(ApplySpritesImageDataWorker)

export type ApplySpritesImageDataWorkerType = typeof ApplySpritesImageDataWorker
