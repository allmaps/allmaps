import { sql, eq } from 'drizzle-orm'

import { generateId, generateChecksum } from '@allmaps/id'
import { fetchJson } from '@allmaps/stdlib'
import { Manifest, Image } from '@allmaps/iiif-parser'

import { schema } from '@allmaps/db/schema'

import { ResponseError, clampLimit } from '@allmaps/api-shared'

import type { LanguageString } from '@allmaps/iiif-parser'
import type { Db } from '@allmaps/db'
import type { UserRole } from '../shared/limits.js'

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
      id: `${restBaseUrl}/canvases/${canvas.id}`,
      manifests: canvas.manifests.map((manifest) => ({
        ...manifest,
        id: `${restBaseUrl}/manifests/${manifest.id}`
      }))
    })),
    organizationUrl: undefined
  }
}

function fromDbCanvas(restBaseUrl: string, dbCanvas: DbCanvas) {
  return {
    ...dbCanvas,
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
      id: {
        eq: params.imageId,
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
      ? (images, { asc, desc }) =>
          params.randomImageIdOp === 'gt' ? asc(images.id) : desc(images.id)
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

  const apiImages = rows.map((image) => fromDbImage(restBaseUrl, image))
  return responseOptions.singular ? apiImages[0] : apiImages
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
      ? (canvases, { asc, desc }) =>
          params.randomCanvasIdOp === 'gt'
            ? asc(canvases.id)
            : desc(canvases.id)
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
      ? (manifests, { asc, desc }) =>
          params.randomManifestIdOp === 'gt'
            ? asc(manifests.id)
            : desc(manifests.id)
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

async function createParsedImage(
  db: Db,
  newImageData: unknown,
  expectedImageId?: string,
  options: CreateIiifOptions = {}
) {
  const newImageChecksum = await generateChecksum(newImageData)
  const newParsedImage = Image.parse(newImageData)
  const newImageId = await generateId(newParsedImage.uri)

  assertAllowedDomain(
    getHttpUrlDomain(newParsedImage.uri),
    options.allowedParsedUriDomains
  )

  if (expectedImageId && newImageId !== expectedImageId) {
    throw new ResponseError("Image downloaded, but IDs don't match", 409)
  }

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
    uri: newParsedImage.uri
  }
}

async function createParsedManifest(
  db: Db,
  newManifestData: unknown,
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

  const resultCanvases: ResultCanvas[] = []

  await db.transaction(async (tx) => {
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

    for (const canvas of newParsedManifest.canvases) {
      const canvasId = await generateId(canvas.uri)
      const canvasLabel = canvas.label

      await tx
        .insert(schema.canvases)
        .values({
          id: canvasId,
          uri: canvas.uri,
          width: canvas.width,
          height: canvas.height,
          label: canvasLabel
        })
        .onConflictDoUpdate({
          target: schema.canvases.id,
          set: {
            width: canvas.width,
            height: canvas.height,
            updatedAt: sql`NOW()`
          }
        })

      const image = canvas.image
      const imageId = await generateId(image.uri)

      await tx
        .insert(schema.images)
        .values({
          id: imageId,
          uri: image.uri,
          width: image.width,
          height: image.height,
          embedded: true
        })
        .onConflictDoUpdate({
          target: schema.images.id,
          set: {
            width: image.width,
            height: image.height,
            updatedAt: sql`NOW()`
          },
          where: eq(schema.images.embedded, true)
        })

      await tx
        .insert(schema.canvasesToImages)
        .values({
          canvasId,
          imageId
        })
        .onConflictDoNothing()

      await tx
        .insert(schema.manifestsToCanvases)
        .values({
          manifestId: newManifestId,
          canvasId
        })
        .onConflictDoNothing()

      resultCanvases.push({
        id: canvasId,
        uri: canvas.uri,
        images: [
          {
            id: imageId,
            uri: image.uri
          }
        ]
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
  const newImageData = await fetchJson(newImageUrl)

  return createParsedImage(db, newImageData, undefined, options)
}

export async function createImage(
  db: Db,
  newImageId: string,
  newImageUrl: string
) {
  const newImageData = await fetchJson(newImageUrl)

  return createParsedImage(db, newImageData, newImageId)
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
  const newManifestData = await fetchJson(newManifestUrl)

  return createParsedManifest(db, newManifestData, undefined, options)
}

export async function createManifest(
  db: Db,
  newManifestId: string,
  newManifestUrl: string
) {
  const newManifestData = await fetchJson(newManifestUrl)

  return createParsedManifest(db, newManifestData, newManifestId)
}
