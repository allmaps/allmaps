import { canonicalImageId } from './image-aliases.js'
import { mapFilters, imageFilters } from './map-filters.js'

import { generateAnnotation } from '@allmaps/annotation'

import { ResponseError, clampLimit } from '@allmaps/api-shared'

import {
  generateFeature,
  generateFeatureCollection
} from '../shared/geojson.js'
import { fromDbRow } from '../shared/maps.js'

import type { Polygon } from 'geojson'

import type { Db } from '@allmaps/db'

import type { MapsQueryParams, ResponseOptions } from '../types.js'

function addRandomMapFilters(params: Partial<MapsQueryParams>) {
  return {
    gt: params.randomMapIdOp === 'gt' ? params.randomMapId : undefined,
    lte: params.randomMapIdOp === 'lte' ? params.randomMapId : undefined
  }
}

export async function queryMaps(
  annotationsBaseUrl: string,
  db: Db,
  params: Partial<MapsQueryParams>,
  responseOptions?: Partial<ResponseOptions>
) {
  if (params.imageId && !params.imageChecksum && !params.checksum) {
    params = { ...params, imageId: await canonicalImageId(db, params.imageId) }
  }
  const defaultResponseOptions: ResponseOptions = {
    format: 'map',
    expectRows: false,
    singular: true,
    resultScope: 'bounded'
  }

  responseOptions = {
    ...defaultResponseOptions,
    ...responseOptions
  }

  const isGeospatialQuery =
    params.intersectsWith || params.containedBy ? true : false
  const onlyLatest = !(params.checksum || params.imageChecksum)
  // Explicit historical versions remain available even when archived.
  const excludeArchived = onlyLatest && responseOptions.excludeArchived

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
      archived: { eq: excludeArchived ? false : undefined },
      ...mapFilters(params),
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
        archived: { eq: excludeArchived ? false : undefined },
        ...imageFilters(params),
        organizationUrl: params.organizationSlug
          ? {
              organization: {
                slug: {
                  eq: params.organizationSlug
                }
              }
            }
          : undefined
      }
    },
    orderBy: (maps, { asc, desc }) => {
      if (params.randomMapId) {
        return asc(maps.id)
      } else if (isGeospatialQuery) {
        return desc(maps.scale)
      } else {
        return desc(maps.updatedAt)
      }
    },
    limit: responseOptions.singular
      ? 1
      : responseOptions.resultScope === 'complete'
        ? undefined
        : clampLimit(params.limit, params.userRole)
  })

  if (
    rows.length === 0 &&
    (responseOptions.expectRows ||
      (responseOptions.expectIiifResource &&
        !(await iiifScopeExists(db, params))))
  ) {
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

async function iiifScopeExists(db: Db, params: Partial<MapsQueryParams>) {
  const columns = { id: true } as const
  if (params.imageChecksum) {
    return db.query.maps.findFirst({
      columns,
      where: { imageId: params.imageId, imageChecksum: params.imageChecksum }
    })
  }
  if (params.imageId)
    return db.query.images.findFirst({
      columns,
      where: { id: params.imageId, archived: false }
    })
  if (params.canvasId)
    return db.query.canvases.findFirst({
      columns,
      where: { id: params.canvasId }
    })
  if (params.manifestId)
    return db.query.manifests.findFirst({
      columns,
      where: { id: params.manifestId }
    })
}
