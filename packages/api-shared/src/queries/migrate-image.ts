import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { schema, type Db, type DbMaps3 } from '@allmaps/db'
import { DbMapsSchema } from '@allmaps/db/maps'
import { generateChecksum, generateId } from '@allmaps/id'
import { Image } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'
import { dbMapToDbMap3 } from '../shared/maps.js'
import { ResponseError } from '../shared/errors.js'
import {
  canonicalImageId,
  lockImageIds,
  repointImageGroup,
  registerImageAliases
} from './image-aliases.js'
import { resolveImageWithMetadata, storeImage } from './iiif.js'

export async function migrateImage(db: Db, requestedId: string, url: string) {
  const { images, maps, snapshots, imageAliases } = schema
  const data = await fetchJson(url)
  const parsed = Image.parse(data)
  const nextId = await generateId(parsed.uri)
  const suppliedId = url.endsWith('/info.json')
    ? await generateId(url.slice(0, -'/info.json'.length))
    : nextId
  const currentId = await canonicalImageId(db, requestedId)
  const [unfetched] = await db
    .select({ uri: images.uri })
    .from(images)
    .where(and(eq(images.id, currentId), isNull(images.data)))
  const resolvedSource = unfetched
    ? await resolveImageWithMetadata(
        db,
        currentId,
        `${unfetched.uri}/info.json`
      )
    : undefined
  const oldId = resolvedSource?.id ?? currentId
  return db.transaction(async (tx) => {
    await lockImageIds(tx, [oldId, nextId, suppliedId])
    const destinationGroup = await canonicalImageId(tx, nextId)
    if (
      (await canonicalImageId(tx, requestedId)) !== oldId ||
      (destinationGroup !== nextId && destinationGroup !== oldId)
    ) {
      throw new ResponseError('Image alias group changed', 409)
    }
    const old = await tx.query.images.findFirst({ where: { id: oldId } })
    if (!old) throw new ResponseError('Image not found', 404)
    const sourceImage =
      old.data == null ? resolvedSource : Image.parse(old.data)
    if (
      !sourceImage ||
      sourceImage.width !== parsed.width ||
      sourceImage.height !== parsed.height
    ) {
      throw new ResponseError(
        'Migration requires matching image dimensions',
        409
      )
    }
    if (oldId === nextId) {
      await storeImage(tx, data)
      await registerImageAliases(tx, [suppliedId], nextId)
      return { id: nextId, uri: parsed.uri }
    }
    const docs = await tx
      .select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.collection, 'images'),
          inArray(snapshots.docId, [oldId, nextId])
        )
      )
    const destination = docs.find((doc) => doc.docId === nextId)
    if (
      (destination &&
        (destination.version !== 1 ||
          Object.keys(destination.data).length !== 0 ||
          destination.docType !== 'http://sharejs.org/types/JSONv1')) ||
      (await tx.query.maps.findFirst({ where: { imageId: nextId } }))
    ) {
      throw new ResponseError('Destination already has map history', 409)
    }
    const source = docs.find((doc) => doc.docId === oldId)
    const current = await tx
      .select()
      .from(maps)
      .where(and(eq(maps.imageId, oldId), eq(maps.latest, true)))
    const snapshot = DbMapsSchema.parse(source?.data ?? {})
    if (
      Object.keys(snapshot).length !== current.length ||
      current.some(
        (row) => row.version !== source?.version || !(row.id in snapshot)
      )
    ) {
      throw new ResponseError(
        'Current edits have not finished persisting; retry the migration',
        409
      )
    }

    const image = await storeImage(tx, data)
    if (source) {
      const copied: DbMaps3 = {}
      for (const value of Object.values(snapshot)) {
        const map = dbMapToDbMap3(value)
        copied[map.id] = { ...map, resource: { ...map.resource, ...image } }
      }
      const version = (destination?.version ?? 0) + 1
      const metadata = { ts: Date.now() }
      let operation
      if (destination) {
        // Preserve the create op of a previously opened, empty Editor document.
        operation = {
          v: destination.version,
          op: [{ r: {}, i: copied }],
          m: metadata
        }
        await tx
          .update(snapshots)
          .set({ data: copied, version, updatedAt: sql`NOW()` })
          .where(
            and(eq(snapshots.collection, 'images'), eq(snapshots.docId, nextId))
          )
      } else {
        operation = {
          v: 0,
          create: { type: source.docType, data: copied },
          m: metadata
        }
        await tx.insert(snapshots).values({
          collection: 'images',
          docId: nextId,
          docType: source.docType,
          version,
          data: copied
        })
      }
      await tx.execute(sql`INSERT INTO ops (collection, doc_id, version, operation)
        VALUES ('images', ${nextId}, ${version}, ${JSON.stringify(operation)}::jsonb)`)
      const imageChecksum = await generateChecksum(copied)
      for (const row of current) {
        const map = copied[row.id]
        await tx.insert(maps).values({
          id: row.id,
          imageId: nextId,
          version,
          map,
          checksum: await generateChecksum(map),
          imageChecksum,
          geoMask: row.geoMask,
          resourceMask: row.resourceMask,
          archived: row.archived
        })
      }
      await tx
        .update(maps)
        .set({ latest: false })
        .where(eq(maps.imageId, oldId))
    }
    await repointImageGroup(tx, oldId, nextId)
    await tx
      .insert(imageAliases)
      .values(
        [oldId, nextId].map((imageId) => ({
          imageId,
          canonicalImageId: nextId
        }))
      )
      .onConflictDoNothing()
    await registerImageAliases(tx, [suppliedId], nextId)
    await tx
      .update(images)
      .set({ archived: old.archived })
      .where(eq(images.id, nextId))
    return { id: nextId, uri: parsed.uri }
  })
}
