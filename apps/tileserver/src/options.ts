import type { Obj } from 'itty-router'

import type { Transformation, Options } from './types.js'

export function optionsFromQuery(query: Obj | undefined): Options {
  let transformation: Transformation = 'polynomial'

  if (query?.transformation === 'thin-plate-spline') {
    transformation = 'thin-plate-spline'
  }

  return {
    transformation
  }
}
