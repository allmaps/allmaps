import type { IRequest } from 'itty-router'

import type { TransformationOptions } from './types.js'
import type { TransformationType } from '@allmaps/transform'

// TODO: simplify when this will be aligned with TransformationOptions from @allmaps/render
export function optionsFromQuery(req: IRequest): TransformationOptions {
  const query = req.query

  let transformationType: TransformationType = 'polynomial'
  const queryTransformationType = query?.['transformation.type']

  if (
    queryTransformationType === 'thin-plate-spline' ||
    queryTransformationType === 'thinPlateSpline'
  ) {
    transformationType = 'thinPlateSpline'
  } else if (queryTransformationType === 'helmert') {
    transformationType = 'helmert'
  }

  return {
    ['transformation.type']: transformationType
  }
}
