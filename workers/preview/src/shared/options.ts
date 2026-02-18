import type { IRequest } from 'itty-router'

import tinycolor from 'tinycolor2'

import {
  blue,
  purple,
  pink,
  orange,
  red,
  green,
  yellow
} from '@allmaps/tailwind'

import type { QueryOptions, Color } from './types.js'
import type { TransformationType } from '@allmaps/transform'
import type { OutputFormat } from '@allmaps/render/wasm'

// TODO: simplify when this will be aligned with TransformationOptions from @allmaps/render
export function optionsFromQuery(req: IRequest): Partial<QueryOptions> {
  const query = req.query

  let transformationType: TransformationType | undefined
  const queryTransformationType = query?.['transformation.type']

  let color: Color | undefined
  let from: [number, number] | undefined
  let bounds: [number, number, number, number] | undefined
  let fit: 'contain' | 'cover' | 'best' | undefined
  let width: number | undefined
  let height: number | undefined
  let background: string | undefined
  let format: OutputFormat = 'png' // Default to PNG

  // Extract format from URL path (e.g., /maps/123.jpg -> 'jpeg')
  const path = req.url ? new URL(req.url).pathname : ''
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    format = 'jpeg'
  } else if (path.endsWith('.webp')) {
    format = 'webp'
  } else if (path.endsWith('.png')) {
    format = 'png'
  }

  if (query.from && typeof query.from === 'string') {
    // TODO: round to 5 decimals
    const fromNumbers = query?.from.split(',').map((coord) => parseFloat(coord))
    from = [fromNumbers[0], fromNumbers[1]]
  }

  // Parse bounds as minLon,minLat,maxLon,maxLat
  if (query.bounds && typeof query.bounds === 'string') {
    const boundsNumbers = query.bounds
      .split(',')
      .map((coord) => parseFloat(coord))
    if (
      boundsNumbers.length === 4 &&
      boundsNumbers.every((n) => !isNaN(n)) &&
      boundsNumbers[0] >= -180 &&
      boundsNumbers[0] <= 180 &&
      boundsNumbers[1] >= -90 &&
      boundsNumbers[1] <= 90 &&
      boundsNumbers[2] >= -180 &&
      boundsNumbers[2] <= 180 &&
      boundsNumbers[3] >= -90 &&
      boundsNumbers[3] <= 90
    ) {
      bounds = boundsNumbers as [number, number, number, number]
    }
  }

  // Parse fit (only if bounds is not specified)
  if (
    !bounds &&
    (query.fit === 'contain' || query.fit === 'cover' || query.fit === 'best')
  ) {
    fit = query.fit
  }

  // Parse width and height
  if (query.width && typeof query.width === 'string') {
    const parsedWidth = parseInt(query.width, 10)
    if (!isNaN(parsedWidth) && parsedWidth > 0) {
      width = parsedWidth
    }
  }

  if (query.height && typeof query.height === 'string') {
    const parsedHeight = parseInt(query.height, 10)
    if (!isNaN(parsedHeight) && parsedHeight > 0) {
      height = parsedHeight
    }
  }

  // Parse background - validate hex color, color name, or "none"
  // Note: use without # (e.g. background=ffffff) or color names
  // (e.g. background=white) since # in URLs is the fragment delimiter
  if (query.background && typeof query.background === 'string') {
    if (query.background === 'none') {
      background = 'none'
    } else {
      const parsed = tinycolor(query.background)
      if (parsed.isValid()) {
        background = '#' + parsed.toHex()
      }
    }
  }

  if (query.color && typeof query.color === 'string') {
    const colors = [
      'blue',
      'purple',
      'pink',
      'orange',
      'red',
      'green',
      'yellow'
    ]

    if (colors.includes(query.color)) {
      if (query.color === 'blue') {
        color = tinycolor(blue).toRgb()
      } else if (query.color === 'purple') {
        color = tinycolor(purple).toRgb()
      } else if (query.color === 'pink') {
        color = tinycolor(pink).toRgb()
      } else if (query.color === 'orange') {
        color = tinycolor(orange).toRgb()
      } else if (query.color === 'red') {
        color = tinycolor(red).toRgb()
      } else if (query.color === 'green') {
        color = tinycolor(green).toRgb()
      } else if (query.color === 'yellow') {
        color = tinycolor(yellow).toRgb()
      }
    }
  }

  if (
    queryTransformationType === 'thin-plate-spline' ||
    queryTransformationType === 'thinPlateSpline'
  ) {
    transformationType = 'thinPlateSpline'
  } else if (queryTransformationType === 'polynomial') {
    transformationType = 'polynomial'
  } else if (queryTransformationType === 'straight') {
    transformationType = 'straight'
  }

  return {
    ['transformation.type']: transformationType,
    from,
    color,
    bounds,
    fit,
    width,
    height,
    background,
    format
  }
}
