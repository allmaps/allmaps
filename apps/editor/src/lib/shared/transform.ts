import { GcpTransformer } from '@allmaps/transform'

import { getCompleteGcps, getResourceMask } from '$lib/shared/maps.js'

import type { DbMap } from '$lib/types/maps.js'

export function transformResourceMaskToGeo(map: DbMap) {
  const gcps = getCompleteGcps(map)
  const resourceMask = getResourceMask(map)
  // TODO: add transformation to DbMap
  const transformer = new GcpTransformer(gcps)

  return transformer.transformToGeo(resourceMask)
}
