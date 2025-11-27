import { generateId, generateRandomId } from '@allmaps/id'

import { getApiUrl } from '$lib/shared/urls.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage
} from '@allmaps/iiif-parser'
import type { PickerProjection } from '@allmaps/components/projections'

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
  DbTransformation,
  DbProjection,
  ResourceMask,
  CompleteDbGcp3
} from '$lib/types/maps.js'
import type { ProjectionsById, Point } from '$lib/types/shared.js'

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

export function getTransformation(dbMap: DbMap): DbTransformation | undefined {
  if (isDbMap3(dbMap)) {
    if (dbMap.transformation) {
      return dbMap.transformation
    }
  }

  return undefined
}

export function getResourceCrs(dbMap: DbMap): DbProjection | undefined {
  if (isDbMap3(dbMap)) {
    if (dbMap.resourceCrs) {
      return dbMap.resourceCrs
    }
  }

  return undefined
}

export function getGcps(dbMap: DbMap): DbGcp3[] {
  const gcps = Object.values(dbMap.gcps).sort(
    (gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0)
  )

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
  image: IIIFImage | EmbeddedIIIFImage,
  index: number
): Promise<DbMap3> {
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
    index,
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
    const gcpIndex =
      'index' in gcp && gcp.index !== undefined ? gcp.index : index

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
      id: gcp.id,
      index: gcpIndex,
      geo,
      resource
    }
  })
}

export function toDbProjection(projection: PickerProjection) {
  if (!projection.id) {
    return
  }

  // projection.id has form https://api.allmaps.org/projections/81959313a5c376fc
  // This function returns the hash
  const id = projection.id.split('/').slice(-1)[0]
  if (id) {
    return { id }
  }
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

export function getFullMapId(annotationsApiBaseUrl: string, mapId: string) {
  return `${annotationsApiBaseUrl}/maps/${mapId}`
}

function toGeoreferencedMapTransformation(transformation?: DbTransformation) {
  if (transformation === 'polynomial2') {
    return {
      type: 'polynomial' as const,
      options: {
        order: 2
      }
    }
  } else if (transformation === 'polynomial3') {
    return {
      type: 'polynomial' as const,
      options: {
        order: 3
      }
    }
  } else if (transformation === 'thinPlateSpline') {
    return {
      type: 'thinPlateSpline' as const
    }
  } else if (transformation === 'helmert') {
    return {
      type: 'helmert' as const
    }
  }

  // TODO: add other tranformation types

  return {
    type: 'polynomial' as const,
    options: {
      order: 1
    }
  }
}

export function toGeoreferencedMapProjection(
  apiBaseUrl: string,
  projection: DbProjection,
  projectionsById: ProjectionsById
) {
  if (!projection) {
    return
  }

  const projectionId = getApiUrl(apiBaseUrl, `projections/${projection?.id}`)
  return projectionsById[projectionId]
}

export function toGeoreferencedMap(
  apiBaseUrl: string,
  annotationsApiBaseUrl: string,
  dbMap: DbMap,
  projectionsById: ProjectionsById
): GeoreferencedMap {
  const dbMap3 = toDbMap3(dbMap)

  const dbResourceCrs = getResourceCrs(dbMap3)

  return {
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    type: 'GeoreferencedMap',
    id: getFullMapId(annotationsApiBaseUrl, dbMap3.id),
    resource: {
      ...dbMap3.resource,
      id: dbMap3.resource.uri || dbMap3.resource.id
    },
    gcps: getCompleteGcps(dbMap3),
    resourceMask: getResourceMask(dbMap3),
    transformation: toGeoreferencedMapTransformation(getTransformation(dbMap3)),
    resourceCrs: dbResourceCrs
      ? toGeoreferencedMapProjection(apiBaseUrl, dbResourceCrs, projectionsById)
      : undefined
  }
}

export function toGeoreferencedMaps(
  apiBaseUrl: string,
  annotationsApiBaseUrl: string,
  dbMaps: DbMap[],
  projectionsById: ProjectionsById
): GeoreferencedMap[] {
  return dbMaps.map((map) =>
    toGeoreferencedMap(apiBaseUrl, annotationsApiBaseUrl, map, projectionsById)
  )
}

export function getSortedGcps(gcps: DbGcp3[]) {
  return gcps.toSorted((gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0))
}
