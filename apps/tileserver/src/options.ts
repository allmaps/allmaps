import type { Obj } from 'itty-router'

import type { Transformation, Options } from './types.js'

export function optionsFromQuery(query: Obj | undefined): Options {
  let transformationType: Transformation = 'polynomial'

  if (query?.['transformation.type'] === 'thin-plate-spline') {
    transformationType = 'thin-plate-spline'
  }

  return {
    ['transformation.type']: transformationType
  }
}
