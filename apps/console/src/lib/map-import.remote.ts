import { command, getRequestEvent } from '$app/server'
import { error, isHttpError } from '@sveltejs/kit'
import { z } from 'zod'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import { generateId } from '@allmaps/id'

import { restFetch } from '$lib/server/rest.js'
import {
  MAP_IMPORT_BATCH_SIZE,
  MAP_IMPORT_SAVE_REQUEST_LIMIT
} from '$lib/map-import.js'

import type { ExistingMaps, MapImportResult } from '$lib/map-import.js'

const imageIdSchema = z.string().regex(/^[0-9a-f]{16}$/)
const reviewSchema = z.array(imageIdSchema).min(1).max(MAP_IMPORT_BATCH_SIZE)
const importSchema = z.object({
  overwriteExisting: z.boolean(),
  images: z
    .array(
      z.object({
        imageId: imageIdSchema,
        maps: z.string().max(MAP_IMPORT_SAVE_REQUEST_LIMIT)
      })
    )
    .min(1)
    .max(MAP_IMPORT_BATCH_SIZE)
})

const existingImageSchema = z.object({
  maps: z.array(z.object({ id: z.string() }))
})
const savedImagesSchema = z.array(
  z.object({ imageId: z.string(), mapIds: z.array(z.string()).nonempty() })
)

const freshRead = { headers: { 'Cache-Control': 'no-cache, no-store' } }

async function requireAdmin() {
  const session = await getRequestEvent().locals.getConsoleSession()
  if (session?.user?.role !== 'admin') {
    error(403, 'Administrator access required')
  }
}

function isMissingImage(cause: unknown, imageId: string) {
  if (!isHttpError(cause, 404)) return false
  try {
    return (
      JSON.parse(cause.body.message)?.error === `Image not found: ${imageId}`
    )
  } catch {
    return false
  }
}

async function getExistingMaps(imageId: string): Promise<ExistingMaps> {
  try {
    const image = existingImageSchema.parse(
      await restFetch(`/images/${imageId}`, freshRead)
    )
    return { existingMapCount: image.maps.length }
  } catch (cause) {
    if (isMissingImage(cause, imageId)) {
      return { existingMapCount: 0 }
    }
    throw cause
  }
}

async function mapInBatches<Input, Output>(
  images: Input[],
  callback: (image: Input) => Promise<Output>
) {
  const results: Output[] = []
  const batchSize = 4
  for (let index = 0; index < images.length; index += batchSize) {
    results.push(
      ...(await Promise.all(
        images.slice(index, index + batchSize).map(callback)
      ))
    )
  }
  return results
}

export const previewMapImport = command(reviewSchema, async (imageIds) => {
  await requireAdmin()
  return mapInBatches(imageIds, async (imageId) => {
    try {
      return { imageId, existing: await getExistingMaps(imageId) }
    } catch (cause) {
      console.error('Failed to review maps for image', imageId, cause)
      return { imageId }
    }
  })
})

export const importMaps = command(
  importSchema,
  async ({ images, overwriteExisting }) => {
    await requireAdmin()
    if (new Set(images.map(({ imageId }) => imageId)).size !== images.length) {
      error(400, 'An image can only appear once per import batch')
    }

    return mapInBatches(
      images,
      async ({ imageId, maps }): Promise<MapImportResult> => {
        try {
          if (
            new TextEncoder().encode(maps).length >
            MAP_IMPORT_SAVE_REQUEST_LIMIT
          ) {
            return { imageId, status: 'failed' }
          }
          const parsed = validateGeoreferencedMap(JSON.parse(maps))
          if (!Array.isArray(parsed) || !parsed.length) {
            return { imageId, status: 'failed' }
          }
          const imageUri = parsed[0].resource.id
          if (
            parsed.some(({ resource }) => resource.id !== imageUri) ||
            (await generateId(imageUri)) !== imageId
          ) {
            return { imageId, status: 'failed' }
          }

          if (!overwriteExisting) {
            const existing = await getExistingMaps(imageId)
            if (existing.existingMapCount) {
              return { imageId, status: 'conflict', ...existing }
            }
          }

          const saved = savedImagesSchema
            .parse(
              await restFetch('/maps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: maps
              })
            )
            .find((image) => image.imageId === imageId)
          if (saved) return { ...saved, status: 'imported' }
        } catch (cause) {
          console.error('Failed to import maps for image', imageId, cause)
        }
        return { imageId, status: 'failed' }
      }
    )
  }
)
