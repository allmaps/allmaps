import { eq, desc } from 'drizzle-orm'

import { schema } from '@allmaps/db'
import { makeMapUrl, makeImageUrl } from '../shared/urls.js'

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
  const rows = await db
    .selectDistinct({
      imageId: schema.maps.imageId,
      imageChecksum: schema.maps.imageChecksum,
      createdAt: schema.maps.createdAt,
      updatedAt: schema.maps.updatedAt
    })
    .from(schema.maps)
    .where(eq(schema.maps.imageId, imageId))
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
