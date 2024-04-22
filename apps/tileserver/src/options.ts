import type { IRequest } from 'itty-router'

import type { TilejsonOptions } from './types.js'
import type { TransformationType } from '@allmaps/transform'

// TODO: simplify thin when TilejsonOptions will be alligned with TransformationOptions from @allmaps/render
export function optionsFromQuery(req: IRequest): TilejsonOptions {
  const query = req.query

  let transformationType: TransformationType = 'polynomial'
  const queryTransformationType = query?.['transformation.type']

  if (
    queryTransformationType === 'thin-plate-spline' ||
    queryTransformationType === 'thinPlateSpline'
  ) {
    transformationType = 'thinPlateSpline'
  }

  return {
    ['transformation.type']: transformationType
  }
}
