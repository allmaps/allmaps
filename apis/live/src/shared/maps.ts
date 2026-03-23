import { generateId, generateChecksum, generateRandomId } from '@allmaps/id'

import type { DbMap2, DbGcps2, DbImageService } from '@allmaps/db'
import type { GeoreferencedMap as ApiMap } from '@allmaps/annotation'

const DB_IMAGE_SERVICE_TYPES: DbImageService[] = [
  'ImageService1',
  'ImageService2',
  'ImageService3'
]

function toDbImageService(type: string | undefined): DbImageService {
  if (type && (DB_IMAGE_SERVICE_TYPES as string[]).includes(type)) {
    return type as DbImageService
  }
  return 'ImageService3'
}

export async function getMapId(map: ApiMap, generateRandomIds = false) {
  if (map.id) {
    return map.id
  } else if (generateRandomIds) {
    return await generateRandomId()
  } else {
    return await generateChecksum(map)
  }
}

export async function toDbMap(
  map: ApiMap,
  generateRandomIds = false
): Promise<DbMap2> {
  const imageId = await generateId(map.resource.id)
  const mapId = await getMapId(map, generateRandomIds)

  const gcps: DbGcps2 = {}
  for (const gcp of map.gcps) {
    let gcpId: string
    if (generateRandomIds) {
      gcpId = await generateRandomId()
    } else {
      gcpId = await generateChecksum(gcp)
    }

    gcps[gcpId] = {
      id: gcpId,
      ...gcp
    }
  }

  return {
    id: mapId,
    gcps,
    resourceMask: map.resourceMask,
    resource: {
      ...map.resource,
      id: imageId,
      uri: map.resource.id,
      type: toDbImageService(map.resource.type),
      width: map.resource.width ?? 0,
      height: map.resource.height ?? 0
    },
    version: 2
  }
}
