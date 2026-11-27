import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
  or,
  sql
} from 'drizzle-orm'

import { Manifest } from '@allmaps/iiif-parser'
import { generateAnnotation } from '@allmaps/annotation'
import { generateRandomId } from '@allmaps/id/sync'

import * as listsSchema from '@allmaps/db/schema/lists'
import * as mapsSchema from '@allmaps/db/schema/maps'
import * as iiifSchema from '@allmaps/db/schema/iiif'

import { ResponseError } from '@allmaps/api-shared'
import { makeMapUrl } from '../shared/urls.js'
import { fromDbRow } from '../shared/maps.js'
import {
  parseStoredJson,
  parseStoredNullableLanguageString
} from '../shared/stored-json.js'

import type { Db, DbOrTx } from '@allmaps/db'
import type { Polygon } from 'geojson'

export async function queryLists(db: Db, username: string, ownerId?: string) {
  const lists = await db.query.lists.findMany({
    columns: {
      id: true,
      name: true,
      deletable: true,
      createdAt: true,
      updatedAt: true
    },
    where: {
      ...(ownerId === undefined ? {} : { userId: ownerId }),
      user: {
        slug: username
      }
    }
  })

  return lists
}

function listUrl(base: string, username: string, listId: string) {
  return new URL(
    `/@${encodeURIComponent(username)}/lists/${encodeURIComponent(listId)}`,
    base
  ).href
}

type ListItemInput =
  | {
      mapId: string
      mapImageId: string
      mapChecksum: string
      mapVersion: number
    }
  | { imageId: string }
  | { canvasId: string }
  | { manifestId: string }

type ItemIdentifier = {
  mapId?: string
  mapChecksum?: string
  imageId?: string
  canvasId?: string
  manifestId?: string
}

function matchItem(item?: ItemIdentifier) {
  const { listItems } = listsSchema
  if (item?.mapId)
    return and(
      eq(listItems.mapId, item.mapId),
      item.mapChecksum === undefined
        ? undefined
        : eq(listItems.mapChecksum, item.mapChecksum)
    )
  if (item?.imageId) return eq(listItems.imageId, item.imageId)
  if (item?.canvasId) return eq(listItems.canvasId, item.canvasId)
  if (item?.manifestId) return eq(listItems.manifestId, item.manifestId)
}

// Resolve each bookmark to its images, then match pinned or latest map revisions.
function listMapMembership(db: DbOrTx, listId: string, key?: ListItemInput) {
  const { listItems } = listsSchema
  const { maps } = mapsSchema
  const { images, canvasesToImages, manifestsToCanvases } = iiifSchema
  return db
    .selectDistinct({
      path: sql<string>`coalesce(
      'maps/' || ${listItems.mapId} || '@' || ${listItems.mapChecksum},
      'images/' || ${listItems.imageId}, 'canvases/' || ${listItems.canvasId},
      'manifests/' || ${listItems.manifestId}
    )`.as('path'),
      id: maps.id,
      imageId: maps.imageId,
      checksum: maps.checksum,
      version: maps.version
    })
    .from(listItems)
    .leftJoin(
      manifestsToCanvases,
      eq(manifestsToCanvases.manifestId, listItems.manifestId)
    )
    .leftJoin(
      canvasesToImages,
      eq(
        canvasesToImages.canvasId,
        sql`coalesce(${listItems.canvasId}, ${manifestsToCanvases.canvasId})`
      )
    )
    .innerJoin(
      images,
      eq(
        images.id,
        sql`coalesce(${listItems.mapImageId}, ${listItems.imageId}, ${canvasesToImages.imageId})`
      )
    )
    .innerJoin(maps, eq(maps.imageId, images.id))
    .where(
      and(
        eq(listItems.listId, listId),
        matchItem(key),
        eq(images.archived, false),
        eq(maps.archived, false),
        isNotNull(maps.geoMask),
        or(
          and(isNull(listItems.mapId), eq(maps.latest, true)),
          and(
            eq(maps.id, listItems.mapId),
            eq(maps.checksum, listItems.mapChecksum),
            eq(maps.version, listItems.mapVersion)
          )
        )
      )
    )
    .as('membership')
}

async function getPublishedList(db: Db, username: string, listId: string) {
  const list = await db.query.lists.findFirst({
    columns: { id: true, name: true },
    where: { id: listId, user: { slug: username } }
  })
  if (!list) throw new ResponseError(`List not found: ${listId}`, 404)
  return list
}

async function queryListMapRows(db: Db, listId: string) {
  const membership = listMapMembership(db, listId)
  const revisions = db
    .select({
      id: membership.id,
      imageId: membership.imageId,
      checksum: membership.checksum,
      version: max(membership.version)
    })
    .from(membership)
    .groupBy(membership.id, membership.imageId, membership.checksum)
  return db.query.maps.findMany({
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
      geoMask: () => sql<Polygon>`NULL`.as('geoMask')
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
            with: {
              manifests: {
                columns: {
                  id: true,
                  uri: true,
                  label: true
                }
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
      RAW: (map) =>
        inArray(
          sql`(${map.id}, ${map.imageId}, ${map.checksum}, ${map.version})`,
          revisions
        )
    },
    orderBy: (maps, { desc }) => [desc(maps.updatedAt)]
  })
}

const listContext = [
  'http://www.w3.org/ns/anno.jsonld',
  {
    georeferenceAnnotations: {
      '@id': 'https://schemas.allmaps.org/lists/georeferenceAnnotations',
      '@type': '@id'
    },
    georeferencedMapCount:
      'https://schemas.allmaps.org/lists/georeferencedMapCount',
    allmapsUrl: {
      '@id': 'https://schemas.allmaps.org/lists/allmapsUrl',
      '@type': '@id'
    },
    fallbackImageService: {
      '@id': 'https://schemas.allmaps.org/lists/fallbackImageService',
      '@type': '@id'
    },
    imageService: {
      '@id': 'https://schemas.allmaps.org/lists/imageService',
      '@type': '@id'
    }
  }
]

function titleFromLabel(value: unknown) {
  const label = parseStoredNullableLanguageString(value)
  return [...(label?.en ?? []), ...Object.values(label ?? {}).flat()]
    .map((value) => String(value).trim())
    .find((text) => text && text !== '-')
}

function firstManifestImage(data: unknown) {
  if (data) {
    try {
      return Manifest.parse(parseStoredJson(data)).canvases[0]?.image.uri
    } catch {
      // Older catalog entries may contain only a partial manifest.
    }
  }
}

async function queryListBookmarks(
  base: string,
  db: DbOrTx,
  username: string,
  listId: string,
  key?: ListItemInput
) {
  const id = listUrl(base, username, listId)
  const membership = listMapMembership(db, listId, key)
  const organization = {
    columns: {},
    with: { organization: { columns: { name: true } } }
  } as const
  const manifestColumns = { uri: true, label: true } as const
  const canvas = {
    columns: { uri: true, label: true },
    with: {
      manifests: { columns: manifestColumns, orderBy: { id: 'asc' }, limit: 1 }
    }
  } as const
  const firstImage = {
    columns: { uri: true },
    limit: 1,
    orderBy: { id: 'asc' }
  } as const
  const [saved, counts] = await Promise.all([
    db.query.listItems.findMany({
      where: { listId, ...key },
      orderBy: {
        createdAt: 'desc',
        mapId: 'asc',
        mapChecksum: 'asc',
        imageId: 'asc',
        canvasId: 'asc',
        manifestId: 'asc'
      },
      with: {
        manifest: {
          columns: { ...manifestColumns, data: true },
          with: {
            organizationUrl: organization,
            canvases: {
              columns: {},
              limit: 1,
              orderBy: { id: 'asc' },
              with: { images: firstImage }
            }
          }
        },
        canvas: {
          ...canvas,
          with: {
            ...canvas.with,
            organizationUrl: organization,
            images: firstImage
          }
        }
      }
    }),
    db
      .select({ path: membership.path, count: count() })
      .from(membership)
      .groupBy(membership.path)
  ])
  const imageIds = saved.flatMap(
    (item) => item.mapImageId ?? item.imageId ?? []
  )
  const images = imageIds.length
    ? await db.query.images.findMany({
        where: { id: { in: imageIds } },
        columns: { id: true, uri: true },
        with: {
          organizationUrl: organization,
          canvases: { ...canvas, limit: 1, orderBy: { id: 'asc' } }
        }
      })
    : []
  const imagesById = new Map(images.map((image) => [image.id, image]))
  const countsByPath = new Map(counts.map((row) => [row.path, row.count]))
  return saved.map((item) => {
    const image = imagesById.get(item.mapImageId ?? item.imageId ?? '')
    const sheet = item.canvas ?? image?.canvases[0]
    const manifest = item.manifest ?? sheet?.manifests[0]
    const uri = item.manifest?.uri ?? item.canvas?.uri ?? image?.uri
    const organizationName = (item.manifest ?? item.canvas ?? image)
      ?.organizationUrl?.organization?.name
    const [path, targetType] = item.mapId
      ? [`maps/${item.mapId}@${item.mapChecksum}`, 'Annotation']
      : item.imageId
        ? [`images/${item.imageId}`, 'dctypes:Service']
        : item.canvasId
          ? [
              `canvases/${item.canvasId}`,
              'http://iiif.io/api/presentation/3#Canvas'
            ]
          : [
              `manifests/${item.manifestId}`,
              'http://iiif.io/api/presentation/3#Manifest'
            ]
    const url = new URL(path, base + '/').href
    const manifestTitle = titleFromLabel(manifest?.label)
    const title = titleFromLabel(sheet?.label) ?? manifestTitle
    const imageService = item.manifest
      ? firstManifestImage(item.manifest.data)
      : (image?.uri ?? item.canvas?.images[0]?.uri)
    return {
      id: `${id}#${path}`,
      type: 'Annotation',
      motivation: 'bookmarking',
      created: item.createdAt.toISOString(),
      georeferencedMapCount: countsByPath.get(path) ?? 0,
      allmapsUrl: url,
      target: {
        id: item.mapId ? url : uri,
        type: targetType,
        'dcterms:title': title,
        'dcterms:isPartOf':
          !item.manifest && manifest
            ? { id: manifest.uri, 'dcterms:title': manifestTitle }
            : undefined,
        'schema:provider': organizationName
          ? { 'schema:name': organizationName }
          : undefined,
        imageService,
        fallbackImageService: !imageService
          ? item.manifest?.canvases[0]?.images[0]?.uri
          : undefined
      }
    }
  })
}

export async function queryList(
  base: string,
  db: Db,
  username: string,
  listId: string
) {
  const list = await getPublishedList(db, username, listId)
  const id = listUrl(base, username, list.id)
  const items = await queryListBookmarks(base, db, username, listId)
  const pageId = id + '#bookmarks'
  return {
    '@context': listContext,
    id,
    type: 'AnnotationCollection',
    label: list.name,
    total: items.length,
    georeferenceAnnotations: id + '/georeference-annotations',
    first: items.length
      ? { id: pageId, type: 'AnnotationPage', partOf: id, startIndex: 0, items }
      : undefined,
    last: items.length ? pageId : undefined
  }
}

export async function queryListGeoreferenceAnnotations(
  annotationsBaseUrl: string,
  db: Db,
  username: string,
  listId: string
) {
  const list = await getPublishedList(db, username, listId)
  const rows = await queryListMapRows(db, list.id)
  if (!rows.length) return

  const maps = rows.map((row) => ({
    ...fromDbRow(row, annotationsBaseUrl),
    id: makeMapUrl(annotationsBaseUrl, row.id, row.checksum)
  }))
  return {
    ...generateAnnotation(maps),
    id: `${listUrl(annotationsBaseUrl, username, list.id)}/georeference-annotations`,
    label: list.name
  }
}

export async function queryUserLists(db: Db, userId: string) {
  return db
    .select()
    .from(listsSchema.lists)
    .where(eq(listsSchema.lists.userId, userId))
    .orderBy(listsSchema.lists.createdAt)
}

export async function createUserList(db: Db, userId: string, name: string) {
  const id = generateRandomId()
  const [list] = await db
    .insert(listsSchema.lists)
    .values({ id, userId, name })
    .returning()
  return list
}

export async function queryUserList(
  db: DbOrTx,
  userId: string,
  listId: string
): Promise<typeof listsSchema.lists.$inferSelect | null> {
  const [list] = await db
    .select()
    .from(listsSchema.lists)
    .where(
      and(
        eq(listsSchema.lists.id, listId),
        eq(listsSchema.lists.userId, userId)
      )
    )
  return list ?? null
}

export async function queryListWithItems(
  db: Db,
  userId: string,
  listId: string
) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true,
      userId: true,
      name: true,
      deletable: true,
      createdAt: true,
      updatedAt: true
    },
    where: {
      id: {
        eq: listId
      },
      userId: {
        eq: userId
      }
    },
    with: {
      listItems: {
        columns: {
          listId: true,
          mapId: true,
          mapImageId: true,
          mapChecksum: true,
          mapVersion: true,
          imageId: true,
          canvasId: true,
          manifestId: true,
          createdAt: true
        },
        with: {
          canvas: {
            columns: {
              label: true
            }
          },
          manifest: {
            columns: {
              label: true
            }
          }
        }
      }
    }
  })

  if (!list) {
    return
  }

  return {
    id: list.id,
    userId: list.userId,
    name: list.name,
    deletable: list.deletable,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    items: list.listItems.map((item) => ({
      listId: item.listId,
      mapId: item.mapId,
      mapImageId: item.mapImageId,
      mapChecksum: item.mapChecksum,
      mapVersion: item.mapVersion,
      imageId: item.imageId,
      canvasId: item.canvasId,
      manifestId: item.manifestId,
      createdAt: item.createdAt,
      canvasLabel: parseStoredNullableLanguageString(
        item.canvas?.label ?? null
      ),
      manifestLabel: parseStoredNullableLanguageString(
        item.manifest?.label ?? null
      )
    }))
  }
}

export async function updateUserListName(
  db: Db,
  userId: string,
  listId: string,
  name: string
) {
  const [list] = await db
    .update(listsSchema.lists)
    .set({
      name,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(listsSchema.lists.id, listId),
        eq(listsSchema.lists.userId, userId)
      )
    )
    .returning()

  return list ?? null
}

export async function deleteListItem(
  db: Db,
  listId: string,
  item: ItemIdentifier
): Promise<
  { success: true } | { success: false; status: number; error: string }
> {
  const condition = matchItem(item)
  if (!condition) {
    return { success: false, status: 400, error: 'No item identifier provided' }
  }
  await db
    .delete(listsSchema.listItems)
    .where(and(eq(listsSchema.listItems.listId, listId), condition))
  return { success: true }
}

async function insertListItem(
  db: DbOrTx,
  listId: string,
  item: ListItemInput,
  maximumItems?: number
) {
  const { lists, listItems } = listsSchema
  if (maximumItems !== undefined) {
    // Lock the list before counting so concurrent saves cannot exceed the cap.
    await db
      .select({ id: lists.id })
      .from(lists)
      .where(eq(lists.id, listId))
      .for('update')
  }
  const [added] = await db
    .insert(listItems)
    .values({ listId, ...item })
    .onConflictDoNothing()
    .returning()
  if (added && maximumItems !== undefined) {
    const total = await db.$count(listItems, eq(listItems.listId, listId))
    if (total > maximumItems)
      throw new ResponseError(
        `List cannot contain more than ${maximumItems} items`,
        409
      )
  }
  return added ?? { listId, ...item }
}

export function addItemToList(
  db: Db,
  listId: string,
  item: ListItemInput,
  maximumItems?: number
) {
  return maximumItems === undefined
    ? insertListItem(db, listId, item)
    : db.transaction((tx) => insertListItem(tx, listId, item, maximumItems))
}

export async function addItemToListByUrl(
  db: Db,
  listId: string,
  url: string,
  maximumItems?: number,
  publication?: { base: string; username: string }
) {
  function save(key: ListItemInput) {
    return db.transaction(async (tx) => {
      const item = await insertListItem(tx, listId, key, maximumItems)
      const [bookmark] = publication
        ? await queryListBookmarks(
            publication.base,
            tx,
            publication.username,
            listId,
            key
          )
        : []
      return { success: true as const, item: { ...item, bookmark } }
    })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { success: false as const, status: 400, error: 'Invalid URL' }
  }

  const parts = parsedUrl.pathname.split('/').filter(Boolean)
  if (parts.length < 2) {
    return {
      success: false as const,
      status: 400,
      error: 'Cannot determine resource type from URL'
    }
  }

  const [resourceType, resourceId] = parts

  if (resourceType === 'images') {
    const [image] = await db
      .select({ id: iiifSchema.images.id })
      .from(iiifSchema.images)
      .where(eq(iiifSchema.images.id, resourceId))

    if (!image) {
      return {
        success: false as const,
        status: 404,
        error: `Image not found: ${resourceId}`
      }
    }

    return save({ imageId: resourceId })
  }

  if (resourceType === 'canvases') {
    const [canvas] = await db
      .select({ id: iiifSchema.canvases.id })
      .from(iiifSchema.canvases)
      .where(eq(iiifSchema.canvases.id, resourceId))

    if (!canvas) {
      return {
        success: false as const,
        status: 404,
        error: `Canvas not found: ${resourceId}`
      }
    }

    return save({ canvasId: resourceId })
  }

  if (resourceType === 'manifests') {
    const [manifest] = await db
      .select({ id: iiifSchema.manifests.id })
      .from(iiifSchema.manifests)
      .where(eq(iiifSchema.manifests.id, resourceId))

    if (!manifest) {
      return {
        success: false as const,
        status: 404,
        error: `Manifest not found: ${resourceId}`
      }
    }

    return save({ manifestId: resourceId })
  }

  if (resourceType === 'maps') {
    const match = resourceId.match(/^([^@]+)(?:@([^@]+))?$/)
    if (!match)
      return { success: false as const, status: 400, error: 'Invalid map URL' }

    const [, mapId, checksum] = match
    const { maps } = mapsSchema
    const [map] = await db
      .select({
        id: maps.id,
        imageId: maps.imageId,
        checksum: maps.checksum,
        version: maps.version
      })
      .from(maps)
      .where(
        and(
          eq(maps.id, mapId),
          checksum ? eq(maps.checksum, checksum) : eq(maps.latest, true)
        )
      )
      .orderBy(desc(maps.version))
      .limit(1)

    if (!map) {
      return {
        success: false as const,
        status: 404,
        error: `Map not found: ${resourceId}`
      }
    }

    return save({
      mapId: map.id,
      mapImageId: map.imageId,
      mapChecksum: map.checksum,
      mapVersion: map.version
    })
  }

  return {
    success: false as const,
    status: 400,
    error: `Unknown resource type: ${resourceType}. Expected maps, images, canvases, or manifests.`
  }
}

export async function deleteUserList(
  db: Db,
  userId: string,
  listId: string
): Promise<
  { success: true } | { success: false; status: number; error: string }
> {
  return await db.transaction(async (tx) => {
    const list = await queryUserList(tx, userId, listId)

    if (!list) {
      return { success: false, status: 404, error: 'List not found' }
    }

    if (!list.deletable) {
      return {
        success: false,
        status: 403,
        error: 'This list cannot be deleted'
      }
    }

    await tx
      .delete(listsSchema.listItems)
      .where(eq(listsSchema.listItems.listId, listId))

    await tx.delete(listsSchema.lists).where(eq(listsSchema.lists.id, listId))

    return { success: true }
  })
}
