import { expose } from 'comlink'

import {
  getColorsArray,
  getColorHistogram,
  getMaxOccurringColor,
  rgbToHex
} from '@allmaps/stdlib'

import type { Map } from '@allmaps/annotation'

export class DetectBackgroundColorWorker {
  detectBackgroundColor(map: Map, imageBitmap: ImageBitmap) {
    // const scale = imageBitmap.width / map.resource.width
    // const mask: SVGPolygon = map.resourceMask.map((point) => [
    //   point[0] * scale,
    //   point[1] * scale
    // ])

    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)

    // https://github.com/microsoft/TypeScript/issues/53614
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const context = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null

    if (context) {
      context.drawImage(
        imageBitmap,
        0,
        0,
        imageBitmap.width,
        imageBitmap.height
      )
      const imageData = context.getImageData(
        0,
        0,
        imageBitmap.width,
        imageBitmap.height
      )
      const colors = getColorsArray(imageData)
      const histogram = getColorHistogram(colors)
      const backgroundColor = getMaxOccurringColor(histogram)

      return rgbToHex(backgroundColor.color)
    }
  }
}

expose(DetectBackgroundColorWorker)

export type DetectBackgroundColorWorkerType = typeof DetectBackgroundColorWorker
