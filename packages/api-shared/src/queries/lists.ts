import { and, eq, sql } from 'drizzle-orm'

import { generateAnnotation } from '@allmaps/annotation'
import { generateRandomId } from '@allmaps/id/sync'

import * as listsSchema from '@allmaps/db/schema/lists'
import * as mapsSchema from '@allmaps/db/schema/maps'
import * as iiifSchema from '@allmaps/db/schema/iiif'

import { ResponseError } from '@allmaps/api-shared'
import { fromDbRow } from '../shared/maps.js'

import type { Annotation, AnnotationPage } from '@allmaps/annotation'
import type { Db, DbOrTx } from '@allmaps/db'
import type { Polygon } from 'geojson'

export async function queryLists(db: Db, username: string) {
  const lists = await db.query.lists.findMany({
    columns: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true
    },
    where: {
      user: {
        slug: username
      }
    }
  })

  return lists
}

export async function queryList(
  annotationsBaseUrl: string,
  db: Db,
  username: string,
  listId: string,
  listUrl?: string
) {
  return queryListGeoreferenceAnnotations(
    annotationsBaseUrl,
    db,
    username,
    listId,
    listUrl
  )
}

function normalizeToAnnotationItems(
  annotation: AnnotationPage | Annotation
): Array<Annotation> {
  if (
    annotation &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    annotation.type === 'AnnotationPage' &&
    'items' in annotation &&
    Array.isArray(annotation.items)
  ) {
    return annotation.items
  }

  if (
    annotation &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    annotation.type === 'Annotation'
  ) {
    return [annotation]
  }

  return []
}

async function queryListMapRows(
  db: Db,
  listItems: Array<{
    mapId: string | null
    mapImageId: string | null
    mapChecksum: string | null
    mapVersion: number | null
    imageId: string | null
    canvasId: string | null
    manifestId: string | null
  }>
) {
  const whereConditions: Array<Record<string, unknown>> = []

  for (const item of listItems) {
    if (
      item.mapId &&
      item.mapImageId &&
      item.mapChecksum &&
      item.mapVersion !== null
    ) {
      whereConditions.push({
        AND: [
          { id: { eq: item.mapId } },
          { imageId: { eq: item.mapImageId } },
          { checksum: { eq: item.mapChecksum } },
          { version: { eq: item.mapVersion } }
        ]
      })
    } else if (item.imageId) {
      whereConditions.push({
        AND: [{ latest: { eq: true } }, { imageId: { eq: item.imageId } }]
      })
    } else if (item.canvasId) {
      whereConditions.push({
        AND: [
          { latest: { eq: true } },
          { image: { canvases: { id: { eq: item.canvasId } } } }
        ]
      })
    } else if (item.manifestId) {
      whereConditions.push({
        AND: [
          { latest: { eq: true } },
          {
            image: {
              canvases: {
                manifests: {
                  id: { eq: item.manifestId }
                }
              }
            }
          }
        ]
      })
    }
  }

  if (whereConditions.length === 0) {
    return []
  }

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
      OR: whereConditions
    },
    orderBy: (maps, { desc }) => [desc(maps.updatedAt)]
  })
}

export async function queryListGeoreferenceAnnotations(
  annotationsBaseUrl: string,
  db: Db,
  username: string,
  listId: string,
  annotationPageId?: string
) {
  const list = await db.query.lists.findFirst({
    columns: {
      id: true
    },
    where: {
      id: {
        eq: listId
      },
      user: {
        slug: {
          eq: username
        }
      }
    },
    with: {
      listItems: {
        columns: {
          mapId: true,
          mapImageId: true,
          mapChecksum: true,
          mapVersion: true,
          imageId: true,
          canvasId: true,
          manifestId: true
        }
      }
    }
  })

  if (!list) {
    throw new ResponseError(`List not found: ${listId}`, 404)
  }

  const rows = await queryListMapRows(
    db,
    list.listItems.map((item) => ({
      mapId: item.mapId,
      mapImageId: item.mapImageId,
      mapChecksum: item.mapChecksum,
      mapVersion: item.mapVersion,
      imageId: item.imageId,
      canvasId: item.canvasId,
      manifestId: item.manifestId
    }))
  )

  const apiMaps = rows.map((row) => fromDbRow(row, annotationsBaseUrl))
  const annotationItems = normalizeToAnnotationItems(
    generateAnnotation(apiMaps)
  )

  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id:
      annotationPageId ??
      `${annotationsBaseUrl}/@${username}/lists/${listId}/georeference-annotations`,
    type: 'AnnotationPage',
    items: annotationItems
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
  const list = await queryUserList(db, userId, listId)

  if (!list) {
    return
  }

  const items = await db.query.listItems.findMany({
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
    where: {
      listId: {
        eq: listId
      }
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
  })

  return {
    ...list,
    items: items.map((item) => ({
      listId: item.listId,
      mapId: item.mapId,
      mapImageId: item.mapImageId,
      mapChecksum: item.mapChecksum,
      mapVersion: item.mapVersion,
      imageId: item.imageId,
      canvasId: item.canvasId,
      manifestId: item.manifestId,
      createdAt: item.createdAt,
      canvasLabel: item.canvas?.label ?? null,
      manifestLabel: item.manifest?.label ?? null
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
  item: {
    mapId?: string
    imageId?: string
    canvasId?: string
    manifestId?: string
  }
): Promise<
  { success: true } | { success: false; status: number; error: string }
> {
  const { mapId, imageId, canvasId, manifestId } = item

  let condition
  if (mapId) {
    condition = and(
      eq(listsSchema.listItems.listId, listId),
      eq(listsSchema.listItems.mapId, mapId)
    )
  } else if (imageId) {
    condition = and(
      eq(listsSchema.listItems.listId, listId),
      eq(listsSchema.listItems.imageId, imageId)
    )
  } else if (canvasId) {
    condition = and(
      eq(listsSchema.listItems.listId, listId),
      eq(listsSchema.listItems.canvasId, canvasId)
    )
  } else if (manifestId) {
    condition = and(
      eq(listsSchema.listItems.listId, listId),
      eq(listsSchema.listItems.manifestId, manifestId)
    )
  } else {
    return { success: false, status: 400, error: 'No item identifier provided' }
  }

  await db.delete(listsSchema.listItems).where(condition)
  return { success: true }
}

export async function addItemToList(
  db: Db,
  listId: string,
  item:
    | {
        mapId: string
        mapImageId: string
        mapChecksum: string
        mapVersion: number
      }
    | { imageId: string }
    | { canvasId: string }
    | { manifestId: string }
) {
  const [listItem] = await db
    .insert(listsSchema.listItems)
    .values({ listId, ...item })
    .returning()
  return listItem
}

export async function addItemToListByUrl(
  db: Db,
  listId: string,
  url: string
): Promise<
  | { success: true; item: typeof listsSchema.listItems.$inferSelect | object }
  | { success: false; status: number; error: string }
> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { success: false, status: 400, error: 'Invalid URL' }
  }

  const parts = parsedUrl.pathname.split('/').filter(Boolean)
  if (parts.length < 2) {
    return {
      success: false,
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
        success: false,
        status: 404,
        error: `Image not found: ${resourceId}`
      }
    }

    const [item] = await db
      .insert(listsSchema.listItems)
      .values({ listId, imageId: resourceId })
      .onConflictDoNothing()
      .returning()
    return { success: true, item: item ?? { listId, imageId: resourceId } }
  }

  if (resourceType === 'canvases') {
    const [canvas] = await db
      .select({ id: iiifSchema.canvases.id })
      .from(iiifSchema.canvases)
      .where(eq(iiifSchema.canvases.id, resourceId))

    if (!canvas) {
      return {
        success: false,
        status: 404,
        error: `Canvas not found: ${resourceId}`
      }
    }

    const [item] = await db
      .insert(listsSchema.listItems)
      .values({ listId, canvasId: resourceId })
      .onConflictDoNothing()
      .returning()
    return { success: true, item: item ?? { listId, canvasId: resourceId } }
  }

  if (resourceType === 'manifests') {
    const [manifest] = await db
      .select({ id: iiifSchema.manifests.id })
      .from(iiifSchema.manifests)
      .where(eq(iiifSchema.manifests.id, resourceId))

    if (!manifest) {
      return {
        success: false,
        status: 404,
        error: `Manifest not found: ${resourceId}`
      }
    }

    const [item] = await db
      .insert(listsSchema.listItems)
      .values({ listId, manifestId: resourceId })
      .onConflictDoNothing()
      .returning()
    return { success: true, item: item ?? { listId, manifestId: resourceId } }
  }

  if (resourceType === 'maps') {
    const [map] = await db
      .select({
        id: mapsSchema.mapsLatest.id,
        imageId: mapsSchema.mapsLatest.imageId,
        checksum: mapsSchema.mapsLatest.checksum,
        version: mapsSchema.mapsLatest.version
      })
      .from(mapsSchema.mapsLatest)
      .where(eq(mapsSchema.mapsLatest.id, resourceId))

    if (!map) {
      return {
        success: false,
        status: 404,
        error: `Map not found: ${resourceId}`
      }
    }

    const [item] = await db
      .insert(listsSchema.listItems)
      .values({
        listId,
        mapId: map.id,
        mapImageId: map.imageId,
        mapChecksum: map.checksum,
        mapVersion: map.version
      })
      .onConflictDoNothing()
      .returning()
    return { success: true, item: item ?? { listId, mapId: map.id } }
  }

  return {
    success: false,
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
