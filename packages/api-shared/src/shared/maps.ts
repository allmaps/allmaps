import { generateId, generateChecksum, generateRandomId } from '@allmaps/id'

import { toFixed } from './numbers.js'
import {
  makeMapUrl,
  makeImageUrl,
  makeCanvasUrl,
  makeManifestUrl
} from './urls.js'
import { DbMapSchema } from '@allmaps/db/maps'
import {
  getProjectionsByDbId,
  getProjectionDbId,
  getProjectionByDbId,
  getProjectionByDefinitionAndName
} from '@allmaps/api-shared/projections'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  DbTransformation,
  DbProjection,
  DbMap,
  DbMap3,
  DbGcp3,
  DbGcps3,
  CompleteDbGcp3
} from '@allmaps/db/types'

import type { ApiMap, DbRow } from '../types.js'

const projectionsByDbId = getProjectionsByDbId()

export function isGcpComplete(gcp: DbGcp3): gcp is CompleteDbGcp3 {
  return gcp.resource && gcp.geo ? true : false
}

export function getCompleteGcps(dbMap: DbMap3): CompleteDbGcp3[] {
  return Object.values(dbMap.gcps).filter(isGcpComplete)
}

export async function getMapId(
  map: GeoreferencedMap,
  generateRandomIds = false
) {
  if (map.id) {
    return map.id
  } else if (generateRandomIds) {
    return await generateRandomId()
  } else {
    return await generateChecksum(map)
  }
}

export async function toDbMap3(
  map: GeoreferencedMap,
  generateRandomIds = false
): Promise<DbMap3> {
  const imageId = await generateId(map.resource.id)
  const mapId = await getMapId(map, generateRandomIds)

  const gcps: DbGcps3 = {}
  for (const [index, gcp] of map.gcps.entries()) {
    let gcpId: string
    if (generateRandomIds) {
      gcpId = await generateRandomId()
    } else {
      gcpId = await generateChecksum(gcp)
    }

    gcps[gcpId] = {
      id: gcpId,
      index,
      ...gcp
    }
  }

  return {
    id: mapId,
    gcps,
    transformation: toDbTransformation(map.transformation),
    resourceCrs: toDbProjection(map.resourceCrs),
    resourceMask: map.resourceMask,
    resource: { ...map.resource, id: imageId, uri: map.resource.id },
    version: 3
  }
}

function getProvider(dbRow: DbRow) {
  if (dbRow.image?.organizationUrl?.organization) {
    return [
      {
        label: { none: [dbRow.image.organizationUrl.organization.name] },
        homepage: dbRow.image.organizationUrl.organization.homepage
          ? [
              {
                id: dbRow.image.organizationUrl.organization.homepage
              }
            ]
          : undefined
      }
    ]
  }
}

function getPartOf(dbRow: DbRow) {
  if (dbRow.image?.canvases.length) {
    return dbRow.image.canvases.flatMap((canvas) => [
      {
        type: 'Canvas' as const,
        id: canvas.uri,
        label: canvas.label || undefined,
        partOf: canvas.manifests.flatMap((manifest) => [
          {
            type: 'Manifest' as const,
            id: manifest.uri,
            label: manifest.label || undefined
          }
        ])
      }
    ])
  }

  return undefined
}

function createUrlFactory(annotationsBaseUrl: string) {
  return {
    map: (mapId: string, versionId?: string) =>
      makeMapUrl(annotationsBaseUrl, mapId, versionId),
    image: (imageId: string, versionId?: string) =>
      makeImageUrl(annotationsBaseUrl, imageId, versionId),
    canvas: (canvasId: string) => makeCanvasUrl(annotationsBaseUrl, canvasId),
    manifest: (manifestId: string) =>
      makeManifestUrl(annotationsBaseUrl, manifestId)
  }
}

function getAllmaps(dbRow: DbRow, urls: ReturnType<typeof createUrlFactory>) {
  return {
    id: urls.map(dbRow.map.id),
    version: urls.map(dbRow.map.id, dbRow.checksum),
    image: dbRow.image
      ? {
          id: urls.image(dbRow.image.id),
          version: urls.image(dbRow.image.id, dbRow.imageChecksum),
          canvases: dbRow.image.canvases.map((canvas) => ({
            id: urls.canvas(canvas.id),
            manifests: canvas.manifests.map((manifest) => ({
              id: urls.manifest(manifest.id)
            }))
          }))
        }
      : undefined,
    scale: dbRow.scale ? toFixed(dbRow.scale, 6) : undefined,
    area: dbRow.area ? toFixed(dbRow.area, 2) : undefined
  }
}

export function dbMapToDbMap3(dbMap: DbMap): DbMap3 {
  if (dbMap.version === 1) {
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
      resourceMask: dbMap.pixelMask,
      resource: {
        id: dbMap.image.id,
        uri: dbMap.image.uri,
        type: dbMap.image.type,
        width: dbMap.image.width,
        height: dbMap.image.height
      },
      version: 3
    }
  } else if (dbMap.version === 2) {
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
      resourceMask: dbMap.resourceMask,
      resource: {
        id: dbMap.resource.id,
        uri: dbMap.resource.uri,
        type: dbMap.resource.type,
        width: dbMap.resource.width,
        height: dbMap.resource.height
      },
      version: 3
    }
  } else if (dbMap.version === 3) {
    return dbMap
  } else {
    throw new Error('Invalid map version')
  }
}

function toDbTransformation(
  transformation?: ApiMap['transformation']
): DbTransformation | undefined {
  if (transformation) {
    if (transformation?.type === 'polynomial') {
      if (transformation.options?.order === 2) {
        return 'polynomial2'
      } else if (transformation.options?.order === 3) {
        return 'polynomial3'
      }

      return 'polynomial1'
    } else if (transformation?.type === 'thinPlateSpline') {
      return 'thinPlateSpline'
    } else if (transformation?.type === 'helmert') {
      return 'helmert'
    }
  }
}

function toDbProjection(
  projection?: ApiMap['resourceCrs']
): DbProjection | undefined {
  if (projection) {
    // TODO: this check will no longer be necessary when
    // new version of @allmaps/annotation package is released
    if ('id' in projection && typeof projection.id === 'string') {
      const dbProjectionId = getProjectionDbId(projection.id)
      if (
        dbProjectionId &&
        getProjectionByDbId(projectionsByDbId, dbProjectionId)
      ) {
        return { id: dbProjectionId }
      }
    } else if (typeof projection.definition === 'string') {
      const completeProjection = getProjectionByDefinitionAndName(
        projectionsByDbId,
        projection.definition,
        projection.name
      )

      if (completeProjection?.id) {
        const dbProjectionId = getProjectionDbId(completeProjection?.id)
        return { id: dbProjectionId }
      }
    }
  }
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

export function toGeoreferencedMapProjection(projection?: DbProjection) {
  if (projection?.id) {
    return getProjectionByDbId(projectionsByDbId, projection.id)
  }
}

//  if (apiMap.) {
//     provider = {
//       provider: [
//         {
//           type: 'Organization',
//           label: { none: [organization.name] },
//           homepage: organization.homepage
//             ? [
//                 {
//                   id: organization.homepage
//                 }
//               ]
//             : undefined
//         }
//       ]
//     }
//   }

export function fromDbRow(dbRow: DbRow, annotationsBaseUrl: string): ApiMap {
  const urls = createUrlFactory(annotationsBaseUrl)
  const partOf = getPartOf(dbRow)
  const provider = getProvider(dbRow)

  const dbMap = DbMapSchema.parse(dbRow.map)
  const map = dbMapToDbMap3(dbMap)

  return {
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    id: urls.map(dbRow.map.id),
    type: 'GeoreferencedMap',
    created: dbRow.createdAt.toISOString(),
    modified: dbRow.updatedAt.toISOString(),
    // TODO: import types from @allmaps/annotation
    resource: {
      ...map.resource,
      id: map.resource.uri,
      partOf,
      provider
    },
    gcps: getCompleteGcps(map),
    resourceMask: map.resourceMask,
    geoMask: dbRow.geoMask ? dbRow.geoMask : undefined,
    // TODO: read from dbRow
    transformation: toGeoreferencedMapTransformation(map.transformation),
    resourceCrs: toGeoreferencedMapProjection(map.resourceCrs),
    _allmaps: getAllmaps(dbRow, urls)
  }
}
