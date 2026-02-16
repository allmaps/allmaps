import type { IRequest } from 'itty-router'

import type { TransformationOptions } from './types.js'
import type { TransformationType } from '@allmaps/transform'

// TODO: simplify when this will be aligned with TransformationOptions from @allmaps/render
export function optionsFromQuery(req: IRequest): TransformationOptions {
  const query = req.query

  const queryTransformationType = query?.['transformation.type']

  // Only override transformation type if explicitly provided in query
  // Otherwise, let the map use its natural transformation type
  let transformationType: TransformationType | undefined = undefined

  if (
    queryTransformationType === 'thin-plate-spline' ||
    queryTransformationType === 'thinPlateSpline'
  ) {
    transformationType = 'thinPlateSpline'
  } else if (queryTransformationType === 'helmert') {
    transformationType = 'helmert'
  } else if (queryTransformationType === 'polynomial') {
    transformationType = 'polynomial'
  }

  // Only include transformation.type if explicitly set
  const options: TransformationOptions = {}
  if (transformationType !== undefined) {
    options['transformation.type'] = transformationType
  }

  return options
}
