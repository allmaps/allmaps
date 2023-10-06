import type { Obj } from 'itty-router'

import type { Transformation, Options } from './types.js'

export function optionsFromQuery(query: Obj | undefined): Options {
  let transformationType: Transformation = 'polynomial'

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
