import { expose } from 'comlink'

import {
  getColorsArray,
  getColorHistogram,
  getMaxOccurringColor,
  rgbToHex
} from '@allmaps/stdlib'

import type { Map } from '@allmaps/annotation'

export class DetectBackgroundColorWorker {
  detectBackgroundColor(map: Map, imageData: ImageData) {
    // const scale = imageBitmap.width / map.resource.width
    // const mask: SVGPolygon = map.resourceMask.map((point) => [
    //   point[0] * scale,
    //   point[1] * scale
    // ])

    const colors = getColorsArray(imageData)
    const histogram = getColorHistogram(colors)
    const backgroundColor = getMaxOccurringColor(histogram)

    return rgbToHex(backgroundColor.color)
  }
}

expose(DetectBackgroundColorWorker)

export type DetectBackgroundColorWorkerType = typeof DetectBackgroundColorWorker
