import type { DbMap3 } from '@allmaps/db'

export function isGcpsValid(map: DbMap3) {
  try {
    const gcps = Object.values(map.gcps)

    // Reject GCPs if resource coords are outside resource
    const filteredGcps = gcps.filter((gcp) => {
      if (map.resource.width && map.resource.height) {
        return (
          gcp.resource &&
          (gcp.resource[0] >= 0 ||
            gcp.resource[0] < map.resource.width ||
            gcp.resource[1] >= 0 ||
            gcp.resource[1] < map.resource.height)
        )
      }
      return true
    })

    // Helmert transformation requires at least 2 GCPs
    // The other transformations require at least 3 GCPs
    if (filteredGcps.length < 2) {
      return false
    }

    return true
  } catch (err) {
    return false
  }
}

const RESOURCE_MASK_MAX_OUTSIDE_RESOURCE_RATIO = 0.05

export function isResourceMaskValid(map: DbMap3) {
  const resourceWidth = map.resource.width
  const resourceHeight = map.resource.height

  if (!resourceWidth || !resourceHeight) {
    return true
  }

  if (!map.resourceMask || map.resourceMask.length < 3) {
    return false
  }

  const maxOutsideX = RESOURCE_MASK_MAX_OUTSIDE_RESOURCE_RATIO * resourceWidth
  const maxOutsideY = RESOURCE_MASK_MAX_OUTSIDE_RESOURCE_RATIO * resourceHeight

  return !map.resourceMask.some(
    (coordinate) =>
      coordinate[0] < -maxOutsideX ||
      coordinate[0] > resourceWidth + maxOutsideX ||
      coordinate[1] < -maxOutsideY ||
      coordinate[1] > resourceHeight + maxOutsideY
  )
}
