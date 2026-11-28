import { eq, desc, inArray, sql } from 'drizzle-orm'

import { schema } from '@allmaps/db'
import { makeMapUrl, makeImageUrl } from '../shared/urls.js'
import { canonicalImageIdSql } from './image-aliases.js'

import type { Db } from '@allmaps/db'

export async function queryChecksums(
  annotationsBaseUrl: string,
  db: Db,
  mapId: string
) {
  const rows = await db
    .select({
      id: schema.maps.id,
      imageId: schema.maps.imageId,
      checksum: schema.maps.checksum,
      imageChecksum: schema.maps.imageChecksum,
      createdAt: schema.maps.createdAt,
      updatedAt: schema.maps.updatedAt
    })
    .from(schema.maps)
    .where(eq(schema.maps.id, mapId))
    .orderBy(desc(schema.maps.updatedAt))

  if (rows.length === 0) {
    throw new Error(`Map not found: ${mapId}`)
  }

  return rows.map((row) => ({
    version: makeMapUrl(annotationsBaseUrl, row.id, row.checksum),
    image: makeImageUrl(annotationsBaseUrl, row.imageId, row.imageChecksum),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }))
}

export async function queryImageChecksums(
  annotationsBaseUrl: string,
  db: Db,
  imageId: string
) {
  const { imageAliases } = schema
  // Keep alias resolution and history on the same snapshot during an image move.
  // Before alias registration, a legacy image's own ID holds its history.
  const canonical = db
    .$with('canonical_image', { id: sql<string>`id`.as('id') })
    .as(sql`select ${canonicalImageIdSql(imageId)} as id`)
  const memberIds = db
    .select({ id: canonical.id })
    .from(canonical)
    .union(
      db
        .select({ id: imageAliases.imageId })
        .from(imageAliases)
        .innerJoin(canonical, eq(imageAliases.canonicalImageId, canonical.id))
    )
  const rows = await db
    .with(canonical)
    .selectDistinct({
      imageId: schema.maps.imageId,
      imageChecksum: schema.maps.imageChecksum,
      createdAt: schema.maps.createdAt,
      updatedAt: schema.maps.updatedAt
    })
    .from(schema.maps)
    .where(inArray(schema.maps.imageId, memberIds))
    .orderBy(desc(schema.maps.updatedAt))

  if (rows.length === 0) {
    throw new Error(`Image not found: ${imageId}`)
  }

  return rows.map((row) => ({
    version: makeImageUrl(annotationsBaseUrl, row.imageId, row.imageChecksum),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }))
}
