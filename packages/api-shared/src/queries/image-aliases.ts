import { and, eq, exists, inArray, or, sql } from 'drizzle-orm'
import { schema } from '@allmaps/db/schema'
import type { DbOrTx } from '@allmaps/db'
import { ResponseError } from '../shared/errors.js'

const { imageAliases, snapshots } = schema

// Coordinate URL changes with ShareDB commits and snapshot materialization.
export async function lockImageIds(db: DbOrTx, ids: string[]) {
  if (ids.length) {
    const sorted = [...new Set(ids)].sort()
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(id, 0))
      FROM jsonb_array_elements_text(${JSON.stringify(sorted)}::jsonb) WITH ORDINALITY AS ids(id, position)
      ORDER BY position`)
  }
}

export async function canonicalImageId(db: DbOrTx, imageId: string) {
  const [row] = await db
    .select()
    .from(imageAliases)
    .where(eq(imageAliases.imageId, imageId))
  return row?.canonicalImageId ?? imageId
}

// Opening Editor creates a version-one empty document even before any edits.
export async function editedImageGroups(db: DbOrTx, groupIds: string[]) {
  const { maps } = schema
  const rows = await db
    .selectDistinct({ id: imageAliases.canonicalImageId })
    .from(imageAliases)
    .where(
      and(
        inArray(imageAliases.canonicalImageId, groupIds),
        or(
          exists(
            db
              .select({ id: maps.id })
              .from(maps)
              .where(eq(maps.imageId, imageAliases.imageId))
          ),
          exists(
            db
              .select({ id: snapshots.docId })
              .from(snapshots)
              .where(
                and(
                  eq(snapshots.collection, 'images'),
                  eq(snapshots.docId, imageAliases.imageId),
                  sql`(${snapshots.version} > 1 OR ${snapshots.data} <> '{}'::jsonb)`
                )
              )
          )
        )
      )
    )
  return rows.map(({ id }) => id)
}

async function moveCanvasLinks(db: DbOrTx, fromIds: string[], to: string) {
  if (!fromIds.length) return
  const links = schema.canvasesToImages
  const predicate = inArray(links.imageId, fromIds)
  await db.execute(sql`INSERT INTO ${links} (canvas_id, image_id)
    SELECT DISTINCT ${links.canvasId}, ${to} FROM ${links} WHERE ${predicate}
    ON CONFLICT DO NOTHING`)
  await db.delete(links).where(predicate)
}

export async function repointImageGroup(db: DbOrTx, from: string, to: string) {
  await moveCanvasLinks(db, [from], to)
  await db
    .update(imageAliases)
    .set({ canonicalImageId: to })
    .where(eq(imageAliases.canonicalImageId, from))
}

export class EditedImageAliasError extends ResponseError {
  readonly imageIds: string[]

  constructor(imageIds: string[]) {
    super('Image alias already has edits requiring reconciliation', 409)
    this.imageIds = imageIds
  }
}

export async function registerImageAliases(
  db: DbOrTx,
  ids: string[],
  canonicalId: string
) {
  const uniqueIds = [...new Set([canonicalId, ...ids])].sort()
  const aliases = uniqueIds.filter((id) => id !== canonicalId)
  if (aliases.length) {
    const documents = await db
      .select({ id: snapshots.docId, data: snapshots.data })
      .from(snapshots)
      .where(
        and(
          eq(snapshots.collection, 'images'),
          inArray(snapshots.docId, aliases),
          sql`NOT EXISTS (SELECT 1 FROM ${imageAliases} WHERE ${imageAliases.imageId} = ${snapshots.docId} AND ${imageAliases.canonicalImageId} = ${canonicalId})`
        )
      )
    const edited = documents.filter((doc) => Object.keys(doc.data ?? {}).length)
    if (edited.length)
      throw new EditedImageAliasError(edited.map((doc) => doc.id))
  }
  await db
    .insert(imageAliases)
    .values(
      uniqueIds.map((imageId) => ({
        imageId,
        canonicalImageId: canonicalId
      }))
    )
    .onConflictDoNothing()
  const rows = await db
    .select()
    .from(imageAliases)
    .where(inArray(imageAliases.imageId, uniqueIds))
  if (rows.some((row) => row.canonicalImageId !== canonicalId)) {
    throw new ResponseError(
      'Image services already belong to different canonical images',
      409
    )
  }
  await moveCanvasLinks(db, aliases, canonicalId)
}
