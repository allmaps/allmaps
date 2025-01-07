import { generateId, generateRandomId } from '@allmaps/id'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'
import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage
} from '@allmaps/iiif-parser'

import type {
  DbMap1,
  DbMap2,
  DbMap3,
  DbMap,
  DbMaps,
  DbMaps3,
  DbGcp1,
  DbGcp2,
  DbGcp3,
  DbGcp,
  ResourceMask,
  CompleteDbGcp3
} from '$lib/types/maps.js'
import type { Point } from '$lib/types/shared.js'

import { PUBLIC_ALLMAPS_ANNOTATIONS_API_URL } from '$env/static/public'

export function isDbMap1(dbMap: DbMap): dbMap is DbMap1 {
  return dbMap.version === 1
}

export function isDbMap2(dbMap: DbMap): dbMap is DbMap2 {
  return dbMap.version === 2
}

export function isDbMap3(dbMap: DbMap): dbMap is DbMap3 {
  return dbMap.version === 3
}

export function isDbGcp1(dbGcp: DbGcp): dbGcp is DbGcp1 {
  return 'image' in dbGcp
}

export function isDbGcp2(dbGcp: DbGcp): dbGcp is DbGcp2 {
  return 'resource' in dbGcp
}

export function isDbGcp3(dbGcp: DbGcp): dbGcp is DbGcp3 {
  return 'timestamp' in dbGcp
}

export function getResourceMask(dbMap: DbMap): ResourceMask {
  if (isDbMap1(dbMap)) {
    return dbMap.pixelMask
  } else {
    return dbMap.resourceMask
  }
}

export function getTransformation(dbMap: DbMap3) {
  if (dbMap.transformation) {
    return dbMap.transformation
  }

  return undefined
}

function getGcps(dbMap: DbMap): DbGcp3[] {
  let gcps: DbGcp[]
  if (isDbMap3(dbMap)) {
    gcps = Object.values(dbMap.gcps)
  } else {
    gcps = Object.values(dbMap.gcps)
  }

  return toDbGcps3(gcps)
}

export function getCompleteGcps(dbMap: DbMap): CompleteDbGcp3[] {
  return getGcps(dbMap).filter(isGcpComplete)
}

export function getIncompleteGcps(dbMap: DbMap): DbGcp3[] {
  return getGcps(dbMap).filter((gcp) => !isGcpComplete(gcp))
}

export function getGcpResourcePoint(dbGcp: DbGcp) {
  if (isDbGcp1(dbGcp)) {
    return dbGcp.image
  } else {
    return dbGcp.resource
  }
}

export function getGcpGeoPoint(dbGcp: DbGcp) {
  if (isDbGcp1(dbGcp)) {
    return dbGcp.world
  } else {
    return dbGcp.geo
  }
}

export async function createMapWithFullImageResourceMask(
  image: IIIFImage | EmbeddedIIIFImage
) {
  const mapId = await generateRandomId()
  const imageAllmapsId = await generateId(image.uri)

  const resourceMask = [
    [0, 0],
    [0, image.height],
    [image.width, image.height],
    [image.width, 0]
  ] as Point[]

  return {
    id: mapId,
    version: 3 as const,
    resource: {
      id: imageAllmapsId,
      uri: image.uri,
      width: image.width,
      height: image.height,
      type:
        image.majorVersion === 2
          ? ('ImageService2' as const)
          : ('ImageService3' as const)
    },
    gcps: {},
    resourceMask
  }
}

export function toDbGcps3(gcps: DbGcp[]): DbGcp3[] {
  return gcps.map((gcp, index) => {
    let id = gcp.id

    index = 'index' in gcp ? gcp.index : index

    let geo
    let resource

    if (isDbGcp1(gcp)) {
      geo = gcp.world
      resource = gcp.image
    } else {
      geo = gcp.geo
      resource = gcp.resource
    }

    return {
      id,
      index,
      geo,
      resource
    }
  })
}

export function toDbMap3(dbMap: DbMap): DbMap3 {
  if (isDbMap1(dbMap)) {
    return {
      id: dbMap.id,
      gcps: Object.values(dbMap.gcps).reduce(
        (gcps, gcp, index) => ({
          ...gcps,
          [gcp.id]: {
            id: gcp.id,
            index,
            resource: gcp.image,
            geo: gcp.world
          }
        }),
        {}
      ),

      resource: dbMap.image,
      resourceMask: dbMap.pixelMask,
      version: 3
    }
  } else if (isDbMap2(dbMap)) {
    return {
      id: dbMap.id,
      gcps: Object.values(dbMap.gcps).reduce(
        (gcps, gcp, index) => ({
          ...gcps,
          [gcp.id]: {
            ...gcp,
            index
          }
        }),
        {}
      ),
      resource: dbMap.resource,
      resourceMask: dbMap.resourceMask,
      version: 3
    }
  } else if (isDbMap3(dbMap)) {
    return dbMap
  } else {
    throw new Error(`Invalid map version`)
  }
}

export function toDbMap3s(dbMaps: DbMaps): DbMaps3 {
  return Object.values(dbMaps).reduce(
    (maps, dbMap) => ({
      ...maps,
      [dbMap.id]: toDbMap3(dbMap)
    }),
    {}
  )
}

export function isGcpComplete(gcp: DbGcp3): gcp is CompleteDbGcp3 {
  return gcp.resource && gcp.geo ? true : false
}

export function toGeoreferencedMap(dbMap: DbMap): GeoreferencedMap {
  const dbMap3 = toDbMap3(dbMap)

  return {
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    type: 'GeoreferencedMap',
    id: `${PUBLIC_ALLMAPS_ANNOTATIONS_API_URL}/maps/${dbMap3.id}`,
    resource: {
      ...dbMap3.resource,
      id: dbMap3.resource.uri || dbMap3.resource.id
    },

    transformation: getTransformation(dbMap3),
    gcps: getCompleteGcps(dbMap3),
    resourceMask: getResourceMask(dbMap3)
  }
}

export function toGeoreferencedMaps(dbMaps: DbMaps): GeoreferencedMap[] {
  return Object.values(dbMaps).map(toGeoreferencedMap)
}
