import { GcpTransformer } from '@allmaps/transform'

import {
  getCompleteGcps,
  getResourceMask,
  getTransformation
} from '$lib/shared/maps.js'

import type { DbMap } from '$lib/types/maps.js'

export function transformResourceMaskToGeo(map: DbMap) {
  const gcps = getCompleteGcps(map)
  const resourceMask = getResourceMask(map)
  const transformation = getTransformation(map)

  const transformer = new GcpTransformer(gcps, transformation)

  return transformer.transformToGeo(resourceMask)
}
