import { sql, eq } from 'drizzle-orm'

import { generateId, generateChecksum } from '@allmaps/id'
import { fetchJson } from '@allmaps/stdlib'
import { Manifest, Image } from '@allmaps/iiif-parser'

import { schema } from '@allmaps/db/schema'

import { ResponseError } from '@allmaps/api-shared'

import type { Db } from '@allmaps/db'

export async function queryImage(db: Db, imageId: string) {
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
      fetched: sql<boolean>`NOT images.data IS NULL`.as('fetched')
    },
    where: { id: imageId },
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
      }
    }
  })

  if (image) {
    return image
  } else {
    const message = `Image not found: ${imageId}`
    throw new ResponseError(message, 404)
  }
}

export async function queryManifest(db: Db, manifestId: string) {
  const manifest = await db.query.manifests.findFirst({
    columns: {
      id: true,
      uri: true,
      updatedAt: true,
      createdAt: true
    },
    extras: {
      fetched: sql<boolean>`NOT data IS NULL`.as('fetched')
    },
    where: { id: manifestId }
  })

  if (manifest) {
    return manifest
  } else {
    const message = `Manifest not found: ${manifestId}`
    throw new ResponseError(message, 404)
  }
}

export async function createImage(
  db: Db,
  newImageId: string,
  newImageUrl: string
) {
  const newImageData = await fetchJson(newImageUrl)
  const newImageChecksum = await generateChecksum(newImageData)

  const newParsedImage = Image.parse(newImageData)
  const generatedImageId = await generateId(newParsedImage.uri)

  const imagesMatch =
    newParsedImage.type === 'image' && generatedImageId === newImageId

  if (imagesMatch) {
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
  } else {
    throw new ResponseError("Image downloaded, but IDs don't match", 409)
  }
}

export async function createManifest(
  db: Db,
  newManifestId: string,
  newManifestUrl: string
) {
  const newManifestData = await fetchJson(newManifestUrl)
  const newManifestChecksum = await generateChecksum(newManifestData)

  const newParsedManifest = Manifest.parse(newManifestData)
  const generatedManifestId = await generateId(newParsedManifest.uri)

  const manifestsMatch =
    newParsedManifest.type === 'manifest' &&
    generatedManifestId === newManifestId

  if (manifestsMatch) {
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
  } else {
    throw new ResponseError(
      "Manifest downloaded, but doesn't IDs don't match",
      409
    )
  }
}
