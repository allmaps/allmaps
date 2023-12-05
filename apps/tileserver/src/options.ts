import type { Obj } from 'itty-router'

import type { TilejsonOptions } from './types.js'
import type { TransformationType } from '@allmaps/transform'

export function optionsFromQuery(query: Obj | undefined): TilejsonOptions {
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
