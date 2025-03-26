import type { IRequest } from 'itty-router'

import type { QueryOptions } from './types.js'
import type { TransformationType } from '@allmaps/transform'

// TODO: simplify when this will be aligned with TransformationOptions from @allmaps/render
export function optionsFromQuery(req: IRequest): Partial<QueryOptions> {
  const query = req.query

  let transformationType: TransformationType = 'polynomial'
  const queryTransformationType = query?.['transformation.type']

  let from: [number, number] | undefined

  if (query.from && typeof query.from === 'string') {
    // TODO: round to 5 decimals
    const fromNumbers = query?.from.split(',').map((coord) => parseFloat(coord))
    from = [fromNumbers[0], fromNumbers[1]]
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
    from
  }
}
