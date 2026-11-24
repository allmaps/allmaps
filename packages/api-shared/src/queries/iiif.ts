import {
  and,
  arrayContains,
  eq,
  exists,
  gt,
  inArray,
  lte,
  notExists,
  sql
} from 'drizzle-orm'
import { alias, unionAll } from 'drizzle-orm/pg-core'

import { generateId, generateChecksum } from '@allmaps/id'
import {
  generateRandomId,
  generateId as generateImageHash
} from '@allmaps/id/sync'
import { fetchJson, fetchUrl } from '@allmaps/stdlib'
import { Manifest, Image } from '@allmaps/iiif-parser'

import { schema } from '@allmaps/db/schema'

import { ResponseError, clampLimit } from '@allmaps/api-shared'
import { parseStoredNullableLanguageString } from '../shared/stored-json.js'

import type { LanguageString } from '@allmaps/iiif-parser'
import {
  EditedImageAliasError,
  editedImageGroups,
  repointImageGroup,
  lockImageIds,
  registerImageAliases
} from './image-aliases.js'
import type { Db, DbOrTx, DbTransaction } from '@allmaps/db'
import type { UserRole } from '../shared/limits.js'

const iiifRequestOptions = {
  headers: { 'User-Agent': 'Allmaps API (+https://allmaps.org/)' }
}

type DbManifest = {
  id: string
  uri: string
  createdAt: Date
  updatedAt: Date
  label: LanguageString | null
  fetched: boolean
  organizationUrl: {
    organization: {
      id: string
    } | null
  } | null
  canvases: {
    id: string
    uri: string
    images: {
      id: string
      uri: string
      maps: {
        id: string
      }[]
    }[]
  }[]
}

type DbCanvas = {
  id: string
  uri: string
  label: LanguageString | null
  width: number
  height: number
  updatedAt: Date
  createdAt: Date
  organizationUrl: {
    organization: {
      id: string
    } | null
  } | null
  images: {
    id: string
    uri: string
    maps: {
      id: string
    }[]
  }[]
  manifests: {
    id: string
    uri: string
    label: LanguageString | null
  }[]
}

type DbImage = {
  id: string
  uri: string
  width: number | null
  height: number | null
  embedded: boolean
  updatedAt: Date
  createdAt: Date
  fetched: boolean
  organizationUrl: {
    organization: {
      id: string
    } | null
  } | null
  maps: {
    id: string
  }[]
  canvases: {
    id: string
    uri: string
    label: LanguageString | null
    manifests: {
      id: string
      uri: string
      label: LanguageString | null
    }[]
  }[]
}

type CreateIiifOptions = {
  allowedUrlDomains?: string[]
  allowedParsedUriDomains?: string[]
}

function getHttpUrlDomain(url: string) {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    throw new ResponseError('Invalid URL', 400)
  }

  // TODO: maybe only accept HTTPS URLs? Here and in other parts of the codebase?
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new ResponseError('URL must use http or https', 400)
  }

  return parsedUrl.hostname.toLowerCase()
}

function assertAllowedDomain(
  domain: string,
  allowedDomains: string[] | undefined
) {
  if (allowedDomains && !allowedDomains.includes(domain)) {
    throw new ResponseError(`Domain not allowed: ${domain}`, 403)
  }
}

function fromDbManifest(restBaseUrl: string, dbManifest: DbManifest) {
  return {
    ...dbManifest,
    label: parseStoredNullableLanguageString(dbManifest.label),
    organization: dbManifest.organizationUrl?.organization
      ? {
          id: `${restBaseUrl}/organizations/${dbManifest.organizationUrl.organization.id}`
        }
      : undefined,
    canvases: dbManifest.canvases.map((canvas) => ({
      ...canvas,
      id: `${restBaseUrl}/canvases/${canvas.id}`,
      images: canvas.images.map((image) => ({
        ...image,
        id: `${restBaseUrl}/images/${image.id}`,
        maps: image.maps.map((map) => ({
          id: `${restBaseUrl}/maps/${map.id}`
        }))
      }))
    })),
    organizationUrl: undefined,
    id: `${restBaseUrl}/manifests/${dbManifest.id}`
  }
}

function fromDbImage(restBaseUrl: string, dbImage: DbImage) {
  return {
    ...dbImage,
    organization: dbImage.organizationUrl?.organization
      ? {
          id: `${restBaseUrl}/organizations/${dbImage.organizationUrl.organization.id}`
        }
      : undefined,
    id: `${restBaseUrl}/images/${dbImage.id}`,
    maps: dbImage.maps.map((map) => ({
      id: `${restBaseUrl}/maps/${map.id}`
    })),
    canvases: dbImage.canvases.map((canvas) => ({
      ...canvas,
      label: parseStoredNullableLanguageString(canvas.label),
      id: `${restBaseUrl}/canvases/${canvas.id}`,
      manifests: canvas.manifests.map((manifest) => ({
        ...manifest,
        label: parseStoredNullableLanguageString(manifest.label),
        id: `${restBaseUrl}/manifests/${manifest.id}`
      }))
    })),
    organizationUrl: undefined
  }
}

function fromDbCanvas(restBaseUrl: string, dbCanvas: DbCanvas) {
  return {
    ...dbCanvas,
    label: parseStoredNullableLanguageString(dbCanvas.label),
    organization: dbCanvas.organizationUrl?.organization
      ? {
          id: `${restBaseUrl}/organizations/${dbCanvas.organizationUrl.organization.id}`
        }
      : undefined,
    id: `${restBaseUrl}/canvases/${dbCanvas.id}`,
    images: dbCanvas.images.map((image) => ({
      ...image,
      id: `${restBaseUrl}/images/${image.id}`,
      maps: image.maps.map((map) => ({
        id: `${restBaseUrl}/maps/${map.id}`
      }))
    })),
    manifests: dbCanvas.manifests.map((manifest) => ({
      ...manifest,
      label: parseStoredNullableLanguageString(manifest.label),
      id: `${restBaseUrl}/manifests/${manifest.id}`
    })),
    organizationUrl: undefined
  }
}

export async function queryImage(restBaseUrl: string, db: Db, imageId: string) {
  const image = await db.query.images.findFirst({
    columns: {
      id: true,
      uri: true,
      width: true,
      height: true,
      embedded: true,
      updatedAt: true,
      createdAt: true
    },
    extras: {
      fetched: (images, { sql }) =>
        sql<boolean>`${images.data} IS NOT NULL`.as('fetched')
    },
    where: { id: imageId },
    with: {
      organizationUrl: {
        columns: {},
        with: {
          organization: {
            columns: {
              id: true
            }
          }
        }
      },
      maps: {
        columns: {
          id: true
        },
        where: {
          latest: true
        }
      },
      canvases: {
        columns: {
          id: true,
          uri: true,
          label: true
        },
        with: {
          manifests: {
            columns: {
              id: true,
              uri: true,
              label: true
            }
          }
        }
      }
    }
  })

  if (image) {
    return fromDbImage(restBaseUrl, image)
  } else {
    const message = `Image not found: ${imageId}`
    throw new ResponseError(message, 404)
  }
}

export async function queryImages(
  restBaseUrl: string,
  db: Db,
  params: {
    imageId?: string
    imageIds?: string[]
    organizationId?: string
    georeferenced?: boolean
    limit?: number
    randomImageId?: string
    randomImageIdOp?: 'gt' | 'lte'
    userRole?: UserRole
  },
  responseOptions: {
    expectRows: boolean
    singular: boolean
  } = { expectRows: false, singular: false }
) {
  const rows = await db.query.images.findMany({
    columns: {
      id: true,
      uri: true,
      width: true,
      height: true,
      embedded: true,
      updatedAt: true,
      createdAt: true
    },
    extras: {
      fetched: (images, { sql }) =>
        sql<boolean>`${images.data} IS NOT NULL`.as('fetched')
    },
    where: {
      RAW: (image) => sql`NOT EXISTS (
        SELECT 1 FROM ${schema.imageAliases} WHERE ${schema.imageAliases.imageId} = ${image.id}
        AND ${schema.imageAliases.canonicalImageId} <> ${image.id}
      )`,
      id: {
        eq: params.imageId,
        in: params.imageIds,
        ...(params.randomImageIdOp === 'gt'
          ? { gt: params.randomImageId }
          : params.randomImageIdOp === 'lte'
            ? { lte: params.randomImageId }
            : {})
      },
      ...(params.georeferenced !== undefined
        ? params.georeferenced
          ? {
              maps: {
                latest: true
              }
            }
          : {
              NOT: {
                maps: {
                  latest: true
                }
              }
            }
        : {}),
      organizationUrl: params.organizationId
        ? {
            organizationId: {
              eq: params.organizationId
            }
          }
        : undefined
    },
    with: {
      organizationUrl: {
        columns: {},
        with: {
          organization: {
            columns: {
              id: true
            }
          }
        }
      },
      maps: {
        columns: {
          id: true
        },
        where: {
          latest: true
        }
      },
      canvases: {
        columns: {
          id: true,
          uri: true,
          label: true
        },
        with: {
          manifests: {
            columns: {
              id: true,
              uri: true,
              label: true
            }
          }
        }
      }
    },
    orderBy: params.randomImageId
      ? (images, { asc }) => asc(images.id)
      : undefined,
    limit: responseOptions.singular
      ? 1
      : clampLimit(params.limit ?? 100, params.userRole)
  })

  if (responseOptions.expectRows && rows.length === 0) {
    const message = params.imageId
      ? `Image not found: ${params.imageId}`
      : 'Images not found'
    throw new ResponseError(message, 404)
  }

  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const orderedRows = params.imageIds
    ? params.imageIds
        .map((imageId) => rowsById.get(imageId))
        .filter((row): row is DbImage => row !== undefined)
    : rows
  const apiImages = orderedRows.map((image) => fromDbImage(restBaseUrl, image))
  return responseOptions.singular ? apiImages[0] : apiImages
}

export async function queryRandomImagesByOrganizationIds(
  restBaseUrl: string,
  db: Db,
  params: {
    organizationIds: string[]
    georeferenced?: boolean
    limitPerOrganization: number
    requireOrganizationManifest?: boolean
    userRole?: UserRole
  }
) {
  const {
    images,
    organizationUrls,
    maps,
    canvasesToImages,
    manifestsToCanvases,
    manifests
  } = schema
  const requestedValues = sql.join(
    params.organizationIds.map(
      (organizationId, organizationIndex) =>
        sql`(
          ${organizationId}::text,
          ${generateRandomId()}::text,
          ${organizationIndex}::integer
        )`
    ),
    sql`, `
  )
  const requestedOrganizations = db.$with('requested_organizations').as(
    db.select({
      organizationId: sql<string>`organization_id`.as('organization_id'),
      randomId: sql<string>`random_id`.as('random_id'),
      organizationIndex: sql<number>`organization_index`.as(
        'organization_index'
      )
    }).from(sql`(VALUES ${requestedValues}) AS requested_organization (
        organization_id, random_id, organization_index
      )`)
  )
  const latestMaps = db
    .select({ id: maps.id })
    .from(maps)
    .where(and(eq(maps.imageId, images.id), eq(maps.latest, true)))
  const georeferencedFilter =
    params.georeferenced === undefined
      ? undefined
      : params.georeferenced
        ? exists(latestMaps)
        : notExists(latestMaps)

  const manifestOrganizationUrls = alias(
    organizationUrls,
    'manifest_organization_url'
  )
  const organizationManifestFilter = params.requireOrganizationManifest
    ? exists(
        db
          .select({ id: manifests.id })
          .from(canvasesToImages)
          .innerJoin(
            manifestsToCanvases,
            eq(manifestsToCanvases.canvasId, canvasesToImages.canvasId)
          )
          .innerJoin(
            manifests,
            eq(manifests.id, manifestsToCanvases.manifestId)
          )
          .innerJoin(
            manifestOrganizationUrls,
            eq(manifestOrganizationUrls.url, manifests.domain)
          )
          .where(
            and(
              eq(canvasesToImages.imageId, images.id),
              eq(manifestOrganizationUrls.type, 'domain'),
              eq(
                manifestOrganizationUrls.organizationId,
                requestedOrganizations.organizationId
              )
            )
          )
      )
    : undefined

  function selectCandidateImages(wrap: 0 | 1) {
    return db
      .select({ id: images.id, wrap: sql<number>`${wrap}::integer`.as('wrap') })
      .from(images)
      .innerJoin(organizationUrls, eq(organizationUrls.url, images.domain))
      .where(
        and(
          eq(
            organizationUrls.organizationId,
            requestedOrganizations.organizationId
          ),
          wrap === 0
            ? gt(images.id, requestedOrganizations.randomId)
            : lte(images.id, requestedOrganizations.randomId),
          notExists(
            db
              .select({ id: schema.imageAliases.imageId })
              .from(schema.imageAliases)
              .where(
                and(
                  eq(schema.imageAliases.imageId, images.id),
                  sql`${schema.imageAliases.canonicalImageId} <> ${images.id}`
                )
              )
          ),
          georeferencedFilter,
          organizationManifestFilter
        )
      )
      .orderBy(images.id)
      .limit(params.limitPerOrganization)
  }

  // Keep both ID ranges ordered and limited before combining them for wraparound.
  const candidates = unionAll(
    selectCandidateImages(0),
    selectCandidateImages(1)
  ).as('candidate')
  const randomImages = db
    .select({ id: candidates.id, wrap: candidates.wrap })
    .from(candidates)
    .orderBy(candidates.wrap, candidates.id)
    .limit(params.limitPerOrganization)
    .as('random_image')
  const candidateRows = await db
    .with(requestedOrganizations)
    .select({ id: randomImages.id })
    .from(requestedOrganizations)
    .crossJoinLateral(randomImages)
    .orderBy(
      requestedOrganizations.organizationIndex,
      randomImages.wrap,
      randomImages.id
    )
  const imageIds = candidateRows.map(({ id }) => id)

  if (imageIds.length === 0) {
    if (params.requireOrganizationManifest) {
      return []
    }

    throw new ResponseError('Images not found', 404)
  }

  return queryImages(
    restBaseUrl,
    db,
    {
      imageIds,
      limit: imageIds.length,
      userRole: params.userRole
    },
    { expectRows: true, singular: false }
  )
}

export async function queryCanvases(
  restBaseUrl: string,
  db: Db,
  params: {
    canvasId?: string
    organizationId?: string
    georeferenced?: boolean
    limit?: number
    randomCanvasId?: string
    randomCanvasIdOp?: 'gt' | 'lte'
    userRole?: UserRole
  },
  responseOptions: {
    expectRows: boolean
    singular: boolean
  } = { expectRows: false, singular: false }
) {
  const rows = await db.query.canvases.findMany({
    columns: {
      id: true,
      uri: true,
      label: true,
      width: true,
      height: true,
      updatedAt: true,
      createdAt: true
    },
    where: {
      id: {
        eq: params.canvasId,
        ...(params.randomCanvasIdOp === 'gt'
          ? { gt: params.randomCanvasId }
          : params.randomCanvasIdOp === 'lte'
            ? { lte: params.randomCanvasId }
            : {})
      },
      ...(params.georeferenced !== undefined
        ? params.georeferenced
          ? {
              images: {
                maps: {
                  latest: true
                }
              }
            }
          : {
              NOT: {
                images: {
                  maps: {
                    latest: true
                  }
                }
              }
            }
        : {}),
      images: params.organizationId
        ? {
            organizationUrl: {
              organizationId: {
                eq: params.organizationId
              }
            }
          }
        : undefined
    },
    with: {
      organizationUrl: {
        columns: {},
        with: {
          organization: {
            columns: {
              id: true
            }
          }
        }
      },
      images: {
        columns: {
          id: true,
          uri: true
        },
        with: {
          maps: {
            columns: {
              id: true
            },
            where: {
              latest: true
            }
          }
        }
      },
      manifests: {
        columns: {
          id: true,
          uri: true,
          label: true
        }
      }
    },
    orderBy: params.randomCanvasId
      ? (canvases, { asc }) => asc(canvases.id)
      : undefined,
    limit: responseOptions.singular
      ? 1
      : clampLimit(params.limit ?? 100, params.userRole)
  })

  if (responseOptions.expectRows && rows.length === 0) {
    const message = params.canvasId
      ? `Canvas not found: ${params.canvasId}`
      : 'Canvases not found'
    throw new ResponseError(message, 404)
  }

  const apiCanvases = rows.map((c) => fromDbCanvas(restBaseUrl, c))
  return responseOptions.singular ? apiCanvases[0] : apiCanvases
}

export async function queryManifests(
  restBaseUrl: string,
  db: Db,
  params: {
    manifestId?: string
    organizationId?: string
    georeferenced?: boolean
    limit?: number
    randomManifestId?: string
    randomManifestIdOp?: 'gt' | 'lte'
    userRole?: UserRole
  },
  responseOptions: {
    expectRows: boolean
    singular: boolean
  } = { expectRows: false, singular: false }
) {
  const rows = await db.query.manifests.findMany({
    columns: {
      id: true,
      uri: true,
      label: true,
      updatedAt: true,
      createdAt: true
    },
    extras: {
      fetched: (manifests, { sql }) =>
        sql<boolean>`${manifests.data} IS NOT NULL`.as('fetched')
    },
    where: {
      id: {
        eq: params.manifestId,
        ...(params.randomManifestIdOp === 'gt'
          ? { gt: params.randomManifestId }
          : params.randomManifestIdOp === 'lte'
            ? { lte: params.randomManifestId }
            : {})
      },
      ...(params.georeferenced !== undefined
        ? params.georeferenced
          ? {
              canvases: {
                images: {
                  maps: {
                    latest: true
                  }
                }
              }
            }
          : {
              NOT: {
                canvases: {
                  images: {
                    maps: {
                      latest: true
                    }
                  }
                }
              }
            }
        : {}),
      organizationUrl: params.organizationId
        ? {
            organizationId: {
              eq: params.organizationId
            }
          }
        : undefined
    },
    with: {
      organizationUrl: {
        columns: {},
        with: {
          organization: {
            columns: {
              id: true
            }
          }
        }
      },
      canvases: {
        columns: {
          id: true,
          uri: true
        },
        with: {
          images: {
            columns: {
              id: true,
              uri: true
            },
            with: {
              maps: {
                columns: {
                  id: true
                },
                where: {
                  latest: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: params.randomManifestId
      ? (manifests, { asc }) => asc(manifests.id)
      : undefined,
    limit: responseOptions.singular
      ? 1
      : clampLimit(params.limit ?? 100, params.userRole)
  })

  if (responseOptions.expectRows && rows.length === 0) {
    const message = params.manifestId
      ? `Manifest not found: ${params.manifestId}`
      : 'Manifests not found'
    throw new ResponseError(message, 404)
  }

  const apiManifests = rows.map((m) => fromDbManifest(restBaseUrl, m))
  return responseOptions.singular ? apiManifests[0] : apiManifests
}

export async function storeImage(
  db: DbOrTx,
  newImageData: unknown,
  options: CreateIiifOptions = {}
) {
  const newImageChecksum = await generateChecksum(newImageData)
  const newParsedImage = Image.parse(newImageData)
  const newImageId = await generateId(newParsedImage.uri)

  assertAllowedDomain(
    getHttpUrlDomain(newParsedImage.uri),
    options.allowedParsedUriDomains
  )

  await db
    .insert(schema.images)
    .values({
      id: newImageId,
      uri: newParsedImage.uri,
      width: newParsedImage.width,
      height: newParsedImage.height,
      data: newImageData,
      checksum: newImageChecksum,
      embedded: false
    })
    .onConflictDoUpdate({
      target: schema.images.id,
      set: {
        width: newParsedImage.width,
        height: newParsedImage.height,
        data: newImageData,
        checksum: newImageChecksum,
        embedded: false
      }
    })

  return {
    id: newImageId,
    uri: newParsedImage.uri,
    width: newParsedImage.width,
    height: newParsedImage.height,
    type: `ImageService${newParsedImage.majorVersion}` as const
  }
}

function serviceUri(url: string) {
  return url.replace(/\/info\.json$/, '')
}

export async function resolveImageServices(
  db: Db,
  serviceUris: readonly string[],
  options: CreateIiifOptions & {
    sourceUrl?: string
    publisherDomains?: Set<string>
  } = {}
) {
  let publisherDomains = options.publisherDomains
  if (serviceUris.length === 1) {
    const links = schema.manifestsToCanvases
    const [group] = await db
      .select({ services: links.publisherServiceUris })
      .from(links)
      .where(arrayContains(links.publisherServiceUris, [serviceUris[0]]))
      .orderBy(links.manifestId, links.canvasId)
      .limit(1)
    if (group?.services) {
      serviceUris = group.services
      publisherDomains = new Set(serviceUris.map(getHttpUrlDomain))
    }
  }
  const ids = new Set(serviceUris.map((uri) => generateImageHash(uri)))
  const aliases = schema.imageAliases
  const existing = await db
    .select()
    .from(aliases)
    .where(inArray(aliases.imageId, [...ids]))
  const targets = new Set(existing.map((row) => row.canonicalImageId))
  const publisherServices =
    serviceUris.length > 1 &&
    publisherDomains &&
    serviceUris.every((uri) => publisherDomains.has(getHttpUrlDomain(uri)))
  if (targets.size > 1 && !publisherServices)
    throw new ResponseError('Conflicting image aliases', 409)

  const preferredId = generateImageHash(serviceUris[0])
  const knownId =
    existing.find((row) => row.imageId === preferredId)?.canonicalImageId ??
    preferredId
  const known = await db.query.images.findFirst({ where: { id: knownId } })
  if (
    known?.data &&
    targets.size === 1 &&
    existing.length === ids.size &&
    !options.sourceUrl
  ) {
    const parsed = Image.parse(known.data)
    assertAllowedDomain(
      getHttpUrlDomain(parsed.uri),
      options.allowedParsedUriDomains
    )
    return {
      id: known.id,
      uri: parsed.uri,
      width: parsed.width,
      height: parsed.height,
      type: `ImageService${parsed.majorVersion}` as const
    }
  }
  const candidates: unknown[] = []
  const refresh = options.sourceUrl && known?.uri === serviceUris[0]
  if (known?.data && !refresh) candidates.push(known.data)
  for (const uri of serviceUris) {
    if (
      !refresh &&
      known?.data &&
      (known.uri === uri ||
        existing.some((row) => row.imageId === generateImageHash(uri)))
    )
      continue
    getHttpUrlDomain(uri)
    try {
      const data = await fetchJson(
        options.sourceUrl && serviceUri(options.sourceUrl) === uri
          ? options.sourceUrl
          : `${uri.replace(/\/$/, '')}/info.json`,
        iiifRequestOptions
      )
      const parsed = Image.parse(data)
      // Independent services may only contribute an additional alias on a
      // domain whose publisher vouched for the association.
      if (
        !candidates.length ||
        !publisherDomains ||
        publisherDomains.has(getHttpUrlDomain(parsed.uri))
      ) {
        ids.add(await generateId(parsed.uri))
      }
      candidates.push(data)
    } catch (error) {
      if (serviceUris.length === 1) throw error
    }
  }
  if (!candidates.length)
    throw new ResponseError('Image information unavailable', 502)
  // The declared ID may itself have moved since the manifest was published.
  const declared = await generateId(Image.parse(candidates[0]).uri)
  const [target] = await db
    .select()
    .from(aliases)
    .where(eq(aliases.imageId, declared))
  let data = candidates[0]
  if (target && target.canonicalImageId !== declared) {
    const current = await db.query.images.findFirst({
      where: { id: target.canonicalImageId }
    })
    if (!current?.data)
      throw new ResponseError('Missing canonical image information', 409)
    data = current.data
  } else if (!known?.data && !serviceUris.includes(Image.parse(data).uri)) {
    // A proxy can point to a canonical service. Read the metadata from that
    // service before storing it under the publisher's ID.
    const canonicalUri = Image.parse(data).uri
    getHttpUrlDomain(canonicalUri)
    data = await fetchJson(
      `${canonicalUri.replace(/\/$/, '')}/info.json`,
      iiifRequestOptions
    )
    if (Image.parse(data).uri !== canonicalUri)
      throw new ResponseError('Inconsistent canonical image ID', 409)
  }
  return db.transaction(async (tx) => {
    const dataId = generateImageHash(Image.parse(data).uri)
    ids.add(dataId)
    let image
    if (publisherServices && publisherDomains) {
      image = await reconcilePublisherServices(
        tx,
        [...ids],
        dataId,
        data,
        publisherDomains,
        options
      )
    } else {
      await lockImageIds(tx, [...ids])
      image = await storeImage(tx, data, options)
    }
    await registerImageAliases(tx, [...ids], image.id)
    return image
  })
}

async function reconcilePublisherServices(
  tx: DbTransaction,
  ids: string[],
  preferredId: string,
  data: unknown,
  publisherDomains: Set<string>,
  options: CreateIiifOptions
) {
  const { imageAliases, images } = schema
  // info.json can introduce IDs beyond the ones originally listed in the manifest.
  const readAliases = () =>
    tx.select().from(imageAliases).where(inArray(imageAliases.imageId, ids))
  const beforeLock = await readAliases()
  const locked = new Set([
    ...ids,
    ...beforeLock.map((row) => row.canonicalImageId)
  ])
  await lockImageIds(tx, [...locked])
  const rows = await readAliases()
  const groups = new Set([
    preferredId,
    ...rows.map((row) => row.canonicalImageId)
  ])
  if (
    [...groups].some((id) => !locked.has(id)) ||
    rows.some(
      (row) =>
        row.imageId === preferredId && row.canonicalImageId !== preferredId
    )
  ) {
    throw new ResponseError('Image alias group changed', 409)
  }

  if (groups.size === 1) return storeImage(tx, data, options)

  const records = await tx
    .select({ id: images.id, uri: images.uri, data: images.data })
    .from(images)
    .where(inArray(images.id, [...groups]))
  if (
    !publisherDomains.has(getHttpUrlDomain(Image.parse(data).uri)) ||
    records.some((row) => !publisherDomains.has(getHttpUrlDomain(row.uri)))
  ) {
    throw new ResponseError(
      'Conflicting image aliases outside publisher domains',
      409
    )
  }
  const edited = await editedImageGroups(tx, [...groups])
  if (edited.length > 1) {
    throw new ResponseError(
      'Multiple image services have edits requiring reconciliation',
      409
    )
  }
  const canonical = edited[0] ?? preferredId
  const canonicalData =
    canonical === preferredId
      ? data
      : records.find((row) => row.id === canonical)?.data
  if (!canonicalData)
    throw new ResponseError('Missing canonical image information', 409)

  const image = await storeImage(tx, canonicalData, options)
  for (const group of groups) {
    if (group !== canonical) await repointImageGroup(tx, group, canonical)
  }
  return image
}

async function createParsedManifest(
  db: Db,
  newManifestData: unknown,
  manifestUrl: string,
  expectedManifestId?: string,
  options: CreateIiifOptions = {}
) {
  const newManifestChecksum = await generateChecksum(newManifestData)
  const newParsedManifest = Manifest.parse(newManifestData)
  const newManifestId = await generateId(newParsedManifest.uri)

  if (options.allowedParsedUriDomains) {
    assertAllowedDomain(
      getHttpUrlDomain(newParsedManifest.uri),
      options.allowedParsedUriDomains
    )
  }

  if (expectedManifestId && newManifestId !== expectedManifestId) {
    throw new ResponseError(
      "Manifest downloaded, but doesn't IDs don't match",
      409
    )
  }

  const manifestLabel = newParsedManifest.label

  type ResultCanvas = {
    id: string
    uri: string
    images: [
      {
        id: string
        uri: string
      }
    ]
  }

  const publisher = getHttpUrlDomain(manifestUrl)
  let domains: Set<string> | undefined
  const resultCanvases: ResultCanvas[] = []
  const canvases = newParsedManifest.canvases
  if (canvases.some((canvas) => canvas.image.serviceUris.length > 1)) {
    domains = new Set([publisher])
    const { organizations, organizationUrls } = schema
    const hosts = await db
      .select({ domain: organizationUrls.url })
      .from(organizationUrls)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationUrls.organizationId)
      ).where(sql`${organizationUrls.organizationId} IN (
              SELECT organization_id FROM organization_urls WHERE url = ${publisher}
            ) OR lower(split_part(split_part(${organizations.homepage}, '://', 2), '/', 1)) = ${publisher}`)
    for (const row of hosts) domains.add(row.domain)
  }

  const preferredIds = canvases.map((canvas) =>
    generateImageHash(canvas.image.uri)
  )
  await db.transaction(async (tx) => {
    const { imageAliases, images } = schema
    const readKnown = () =>
      tx
        .select({
          from: imageAliases.imageId,
          id: images.id,
          uri: images.uri
        })
        .from(imageAliases)
        .innerJoin(images, eq(images.id, imageAliases.canonicalImageId))
        .where(
          sql`${imageAliases.imageId} IN (SELECT jsonb_array_elements_text(${JSON.stringify(preferredIds)}::jsonb))`
        )
    const before = await readKnown()
    const locked = new Set([...preferredIds, ...before.map((row) => row.id)])
    await lockImageIds(tx, [...locked])
    const known = await readKnown()
    if (known.some(({ id }) => !locked.has(id))) {
      throw new ResponseError(
        'Image alias group changed; retry manifest registration',
        409
      )
    }
    const byId = new Map(known.map((image) => [image.from, image]))
    await tx
      .insert(schema.manifests)
      .values({
        id: newManifestId,
        uri: newParsedManifest.uri,
        data: newManifestData,
        checksum: newManifestChecksum,
        label: manifestLabel
      })
      .onConflictDoUpdate({
        target: schema.manifests.id,
        set: {
          data: newManifestData,
          checksum: newManifestChecksum,
          updatedAt: sql`NOW()`
        }
      })

    // Bound the number of SQL parameters even for very large manifests.
    for (let offset = 0; offset < canvases.length; offset += 500) {
      const chunk = canvases.slice(offset, offset + 500)
      const canvasRows = new Map<string, typeof schema.canvases.$inferInsert>()
      const placeholders = new Map<string, typeof images.$inferInsert>()
      const imageLinks = []
      const manifestLinks = new Map<
        string,
        typeof schema.manifestsToCanvases.$inferInsert
      >()
      for (const [index, canvas] of chunk.entries()) {
        const canvasId = generateImageHash(canvas.uri)
        const id = preferredIds[offset + index]
        const image = byId.get(id) ?? { id, uri: canvas.image.uri }
        if (!byId.has(id)) placeholders.set(id, { id, uri: image.uri })
        canvasRows.set(canvasId, {
          id: canvasId,
          uri: canvas.uri,
          width: canvas.width,
          height: canvas.height,
          label: canvas.label
        })
        imageLinks.push({ canvasId, imageId: image.id })
        const services = canvas.image.serviceUris
        manifestLinks.set(canvasId, {
          canvasId,
          manifestId: newManifestId,
          publisherServiceUris:
            services.length > 1 &&
            domains &&
            services.every((uri) => domains.has(getHttpUrlDomain(uri)))
              ? [...services]
              : null
        })
        resultCanvases.push({
          id: canvasId,
          uri: canvas.uri,
          images: [{ id: image.id, uri: image.uri }]
        })
      }
      if (placeholders.size)
        await tx
          .insert(images)
          .values([...placeholders.values()])
          .onConflictDoNothing()
      await tx
        .insert(schema.canvases)
        .values([...canvasRows.values()])
        .onConflictDoUpdate({
          target: schema.canvases.id,
          set: {
            width: sql`excluded.width`,
            height: sql`excluded.height`,
            updatedAt: sql`NOW()`
          }
        })
      await tx
        .insert(schema.canvasesToImages)
        .values(imageLinks)
        .onConflictDoNothing()
      await tx
        .insert(schema.manifestsToCanvases)
        .values([...manifestLinks.values()])
        .onConflictDoUpdate({
          target: [
            schema.manifestsToCanvases.manifestId,
            schema.manifestsToCanvases.canvasId
          ],
          set: { publisherServiceUris: sql`excluded.publisher_service_uris` }
        })
    }
  })

  return {
    id: newManifestId,
    uri: newParsedManifest.uri,
    canvases: resultCanvases
  }
}

export async function createImageFromUrl(
  db: Db,
  newImageUrl: string,
  options: CreateIiifOptions = {}
) {
  assertAllowedDomain(getHttpUrlDomain(newImageUrl), options.allowedUrlDomains)
  return resolveImageServices(db, [serviceUri(newImageUrl)], {
    ...options,
    sourceUrl: newImageUrl
  })
}

export async function createImage(
  db: Db,
  newImageId: string,
  newImageUrl: string,
  resolve = false
) {
  const uri = serviceUri(newImageUrl)
  if (newImageId !== (await generateId(uri))) {
    // Existing Editor clients use the ID declared inside the response.
    const data = await fetchJson(newImageUrl, iiifRequestOptions)
    if (newImageId !== (await generateId(Image.parse(data).uri))) {
      throw new ResponseError("Image downloaded, but IDs don't match", 409)
    }
  }
  if (resolve) {
    let image
    try {
      image = await resolveImageServices(db, [uri])
    } catch (error) {
      if (
        !(error instanceof EditedImageAliasError) ||
        !error.imageIds.includes(newImageId)
      )
        throw error
      // Keep a pre-alias edited document accessible until an explicit migration.
      const data = await fetchJson(newImageUrl, iiifRequestOptions)
      const parsed = Image.parse(data)
      return {
        id: newImageId,
        uri,
        width: parsed.width,
        height: parsed.height,
        type: `ImageService${parsed.majorVersion}`,
        data
      }
    }
    const record = await db.query.images.findFirst({
      where: { id: image.id },
      columns: { data: true }
    })
    return { ...image, data: record?.data }
  }
  return resolveImageServices(db, [uri], { sourceUrl: newImageUrl })
}

export async function createManifestFromUrl(
  db: Db,
  newManifestUrl: string,
  options: CreateIiifOptions = {}
) {
  assertAllowedDomain(
    getHttpUrlDomain(newManifestUrl),
    options.allowedUrlDomains
  )
  const response = await fetchUrl(newManifestUrl, iiifRequestOptions)
  const newManifestData: unknown = await response.json()

  return createParsedManifest(
    db,
    newManifestData,
    response.url || newManifestUrl,
    undefined,
    options
  )
}

export async function createManifest(
  db: Db,
  newManifestId: string,
  newManifestUrl: string
) {
  const response = await fetchUrl(newManifestUrl, iiifRequestOptions)
  const newManifestData: unknown = await response.json()

  return createParsedManifest(
    db,
    newManifestData,
    response.url || newManifestUrl,
    newManifestId
  )
}
