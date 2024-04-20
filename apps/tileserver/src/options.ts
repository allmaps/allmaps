// import type { Obj } from 'itty-router'

import type { TilejsonOptions } from './types.js'
import type { TransformationType } from '@allmaps/transform'

import type { IRequest } from 'itty-router'

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
