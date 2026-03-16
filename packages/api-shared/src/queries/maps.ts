import { sql } from 'drizzle-orm'

import { generateAnnotation } from '@allmaps/annotation'

import { schema } from '@allmaps/db/schema'
import { ResponseError } from '@allmaps/api-shared'

import {
  generateFeature,
  generateFeatureCollection
} from '../shared/geojson.js'
import { fromDbRow } from '../shared/maps.js'

import type { Polygon } from 'geojson'

import type { Db } from '@allmaps/db'

import type { MapsQueryParams, ResponseOptions } from '../types.js'

function addScaleAreaFilters(params: Partial<MapsQueryParams>) {
  return [
    {
      area: {
        lt: params.maxArea,
        gt: params.minArea
      }
    },
    {
      scale: {
        lt: params.maxScale,
        gt: params.minScale
      }
    }
  ]
}

function addRandomMapFilters(params: Partial<MapsQueryParams>) {
  return {
    gt: params.randomMapIdOp === 'gt' ? params.randomMapId : undefined,
    lte: params.randomMapIdOp === 'lte' ? params.randomMapId : undefined
  }
}

function addGeospatialFilters(
  isGeospatialQuery: boolean,
  params: Partial<MapsQueryParams>,
  maps: typeof schema.maps
) {
  if (isGeospatialQuery) {
    if (params.intersectsWith && params.intersectsWith.length === 2) {
      const lat = params.intersectsWith[0]
      const lng = params.intersectsWith[1]
      return sql`ST_Contains(${maps.geoMask}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`
    } else if (params.intersectsWith && params.intersectsWith.length === 4) {
      const lat1 = params.intersectsWith[0]
      const lng1 = params.intersectsWith[1]
      const lat2 = params.intersectsWith[2]
      const lng2 = params.intersectsWith[3]
      return sql`ST_Intersects(${maps.geoMask}, ST_MakeEnvelope(${lng1}, ${lat1}, ${lng2}, ${lat2}, 4326))`
    } else if (params.containedBy) {
      const lat1 = params.containedBy[0]
      const lng1 = params.containedBy[1]
      const lat2 = params.containedBy[2]
      const lng2 = params.containedBy[3]
      return sql`ST_Contains(ST_MakeEnvelope(${lng1}, ${lat1}, ${lng2}, ${lat2}, 4326), ${maps.geoMask})`
    }
  }

  return sql`TRUE`
}

export async function queryMaps(
  annotationsBaseUrl: string,
  db: Db,
  params: Partial<MapsQueryParams>,
  responseOptions?: Partial<ResponseOptions>
) {
  const defaultResponseOptions: ResponseOptions = {
    format: 'map',
    expectRows: false,
    singular: true
  }

  responseOptions = {
    ...defaultResponseOptions,
    ...responseOptions
  }

  const isGeospatialQuery =
    params.intersectsWith || params.containedBy ? true : false
  const onlyLatest = !(params.checksum || params.imageChecksum)

  const rows = await db.query.maps.findMany({
    columns: {
      id: true,
      imageId: true,
      version: true,
      map: true,
      checksum: true,
      imageChecksum: true,
      scale: true,
      area: true,
      createdAt: true,
      updatedAt: true
    },
    extras: {
      geoMask: (maps, { sql }) =>
        responseOptions.format === 'geojson'
          ? sql<Polygon>`ST_AsGeoJSON(${maps.geoMask})::json`.as('geoMask')
          : sql<Polygon>`NULL`.as('geoMask')
    },
    with: {
      image: {
        columns: {
          id: true,
          uri: true,
          data: true,
          embedded: true
        },
        with: {
          canvases: {
            columns: {
              id: true,
              uri: true,
              label: true
            },
            where: params.canvasId
              ? {
                  id: {
                    eq: params.canvasId
                  }
                }
              : undefined,
            with: {
              manifests: {
                columns: {
                  id: true,
                  uri: true,
                  label: true
                },
                where: params.manifestId
                  ? {
                      id: {
                        eq: params.manifestId
                      }
                    }
                  : undefined
              }
            }
          },
          organizationUrl: {
            columns: {
              url: true
            },
            with: {
              organization: {
                columns: {
                  id: true,
                  name: true,
                  homepage: true,
                  plan: true,
                  slug: true
                }
              }
            }
          }
        }
      }
    },
    where: {
      AND: [
        {
          id: {
            eq: params.mapId,
            ...addRandomMapFilters(params)
          }
        },
        {
          imageId: {
            eq: params.imageId
          }
        },
        {
          latest: { eq: onlyLatest ? true : undefined }
        },
        {
          geoMask: { isNotNull: onlyLatest ? true : undefined }
        },
        {
          RAW: (maps) => addGeospatialFilters(isGeospatialQuery, params, maps)
        },
        ...addScaleAreaFilters(params),
        {
          imageChecksum: {
            eq: params.imageChecksum
          }
        },
        {
          checksum: {
            eq: params.checksum
          }
        }
      ],
      image: {
        domain: {
          eq: params.imageServiceDomain
        },
        canvases:
          params.canvasId || params.manifestId || params.manifestDomain
            ? {
                id: {
                  eq: params.canvasId
                },
                manifests:
                  params.manifestId || params.manifestDomain
                    ? {
                        id: {
                          eq: params.manifestId
                        },
                        domain: {
                          eq: params.manifestDomain
                        }
                      }
                    : undefined
              }
            : undefined
      }
    },
    orderBy: (maps, { asc, desc }) => {
      if (params.randomMapId) {
        return params.randomMapIdOp === 'gt' ? asc(maps.id) : desc(maps.id)
      } else if (isGeospatialQuery) {
        return desc(maps.scale)
      } else {
        return desc(maps.updatedAt)
      }
    },
    limit: responseOptions.singular ? 1 : params.limit
  })

  if (responseOptions.expectRows && rows.length === 0) {
    let message = 'Not found'
    if (params.mapId) {
      if (params.checksum) {
        message = `Map not found: ${params.mapId} with version ${params.checksum}`
      } else {
        message = `Map not found: ${params.mapId}`
      }
    } else if (params.imageId) {
      if (params.imageChecksum) {
        message = `Image not found: ${params.imageId} with checksum ${params.imageChecksum}`
      } else {
        message = `Image not found: ${params.imageId}`
      }
    } else if (params.manifestId) {
      message = `Manifest not found: ${params.manifestId}`
    }

    throw new ResponseError(message, 404)
  }

  const apiMaps = rows.map((row) => fromDbRow(row, annotationsBaseUrl))

  console.log('queryMaps', { apiMaps })

  if (responseOptions.singular && apiMaps.length > 1) {
    console.error(
      'Single map requested, but multiple maps found:',
      apiMaps.length
    )
  }

  if (responseOptions.format === 'map') {
    return responseOptions.singular ? apiMaps[0] : apiMaps
  } else if (responseOptions.format === 'geojson') {
    return responseOptions.singular
      ? generateFeature(apiMaps[0])
      : generateFeatureCollection(apiMaps)
  } else if (responseOptions.format === 'annotation') {
    const annotation = generateAnnotation(
      responseOptions.singular ? apiMaps[0] : apiMaps
    )

    if (annotation.type === 'AnnotationPage') {
      const annotationPage = annotation
      return {
        id: responseOptions.id,
        ...annotationPage
      }
    } else {
      return annotation
    }
  } else {
    throw new Error(`Invalid responseFormat: ${responseOptions.format}`)
  }
}
