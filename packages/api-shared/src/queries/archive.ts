import { eq } from 'drizzle-orm'

import { schema, type Db } from '@allmaps/db'
import { ResponseError } from '../shared/errors.js'

export async function archiveMap(db: Db, mapId: string) {
  const rows = await db
    .update(schema.maps)
    .set({ archived: true })
    .where(eq(schema.maps.id, mapId))
    .returning({ id: schema.maps.id })

  if (!rows.length) {
    throw new ResponseError(`Map not found: ${mapId}`, 404)
  }

  return { success: true }
}

export async function archiveImage(db: Db, imageId: string) {
  await db.transaction(async (transaction) => {
    const rows = await transaction
      .update(schema.images)
      .set({ archived: true })
      .where(eq(schema.images.id, imageId))
      .returning({ id: schema.images.id })

    if (!rows.length) {
      throw new ResponseError(`Image not found: ${imageId}`, 404)
    }

    await transaction
      .update(schema.maps)
      .set({ archived: true })
      .where(eq(schema.maps.imageId, imageId))
  })

  return { success: true }
}
