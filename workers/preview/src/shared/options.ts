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

// TODO: simplify when this will be aligned with TransformationOptions from @allmaps/render
export function optionsFromQuery(req: IRequest): Partial<QueryOptions> {
  const query = req.query

  let transformationType: TransformationType = 'polynomial'
  const queryTransformationType = query?.['transformation.type']

  let color: Color | undefined
  let from: [number, number] | undefined

  if (query.from && typeof query.from === 'string') {
    // TODO: round to 5 decimals
    const fromNumbers = query?.from.split(',').map((coord) => parseFloat(coord))
    from = [fromNumbers[0], fromNumbers[1]]
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
    color
  }
}
