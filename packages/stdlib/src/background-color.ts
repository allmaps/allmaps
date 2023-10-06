import type { Position } from '@allmaps/types'

type Color = [number, number, number]

type ColorCount = {
  count: number
  color: Color
}

type Histogram = {
  [bin: string]: ColorCount
}

const DEFAULT_BIN_SIZE = 5
const DEFAULT_RESOLUTION = 2

export function getImageData(
  imageElement: HTMLImageElement,
  mask?: Position[]
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (context) {
    canvas.width = imageElement.width
    canvas.height = imageElement.height

    if (mask) {
      context.fillStyle = 'rgba(0, 0, 0, 0)'
      context.fillRect(0, 0, imageElement.width, imageElement.height)

      context.beginPath()
      context.moveTo(mask[0][0], mask[0][1])
      mask.slice(1).forEach((point) => context.lineTo(point[0], point[1]))
      context.closePath()
      context.clip()
    }

    context.drawImage(imageElement, 0, 0)
    return context.getImageData(0, 0, imageElement.width, imageElement.height)
  } else {
    throw new Error('Unable to get canvas context')
  }
}

export function getColorsArray(
  imageData: ImageData,
  resolution = DEFAULT_RESOLUTION
) {
  const colors = []
  for (let x = 0; x < imageData.width; x += resolution) {
    for (let y = 0; y < imageData.height; y += resolution) {
      const startIndex = (x + y * imageData.width) * 4

      const opacity = imageData.data[startIndex + 3]

      if (opacity > 0) {
        const color: Color = [
          imageData.data[startIndex],
          imageData.data[startIndex + 1],
          imageData.data[startIndex + 2]
        ]

        colors.push(color)
      }
    }
  }

  return colors
}

export function getColorHistogram(colors: Color[], binSize = DEFAULT_BIN_SIZE) {
  const histogram: Histogram = {}

  for (const color of colors) {
    const bin = createColorBin(color, binSize)

    if (!histogram[bin]) {
      histogram[bin] = {
        count: 0,
        color
      }
    }

    histogram[bin].count += 1
  }

  return histogram
}

export function getMaxOccurringColor(histogram: Histogram): ColorCount {
  let max = Number.NEGATIVE_INFINITY
  let maxOccurringColor

  for (const { count, color } of Object.values(histogram)) {
    if (count > max) {
      max = count
      maxOccurringColor = color
    }
  }

  if (!maxOccurringColor) {
    throw new Error('Histogram is empty')
  }

  return {
    count: max,
    color: maxOccurringColor
  }
}

function createColorBin(color: Color, binSize: number) {
  return color.map((c) => Math.round(c / binSize)).toString()
}
