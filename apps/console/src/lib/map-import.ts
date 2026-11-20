import { parseAnnotation, validateGeoreferencedMap } from '@allmaps/annotation'
import { generateChecksum, generateId } from '@allmaps/id'
import { ZodError } from 'zod'

import type { GeoreferencedMap } from '@allmaps/annotation'

const mapImportFileLimitMb = 25

export const MAP_IMPORT_FILE_LIMIT = mapImportFileLimitMb * 1024 * 1024
export const MAP_IMPORT_FILE_LIMIT_LABEL = `${mapImportFileLimitMb} MB`
export const MAP_IMPORT_PAGE_SIZE = 25
export const MAP_IMPORT_BATCH_SIZE = 12
// The existing Live API JSON parser limits each save request to 100 KiB.
export const MAP_IMPORT_SAVE_REQUEST_LIMIT = 100 * 1024

export type MapImportImage = {
  imageId: string
  imageUri: string
  maps: GeoreferencedMap[]
  exceedsSaveLimit: boolean
}

export type ExistingMaps = {
  existingMapCount: number
}

export type MapImportResult = { imageId: string } & (
  | { status: 'imported'; mapIds: string[] }
  | ({ status: 'conflict' } & ExistingMaps)
  | { status: 'failed' }
)

export async function prepareMapImport(
  file: string
): Promise<MapImportImage[]> {
  let annotation: unknown
  try {
    annotation = JSON.parse(file)
  } catch (cause) {
    throw new Error('This file contains invalid JSON', { cause })
  }

  let maps: GeoreferencedMap[]
  try {
    const parsed = parseAnnotation(annotation)
    const validated = validateGeoreferencedMap(parsed)
    maps = Array.isArray(validated) ? validated : [validated]
  } catch (cause) {
    const issue = cause instanceof ZodError ? cause.issues[0] : undefined
    const path = issue?.path.join('.')
    if (issue && path) {
      throw new Error(
        `Invalid Georeference Annotation at ${path}. ${issue.message}`,
        { cause }
      )
    }
    throw new Error('This file contains no valid Georeference Annotations', {
      cause
    })
  }
  if (!maps.length) throw new Error('This file contains no maps')

  const mapsByImage = new Map<string, Map<string, GeoreferencedMap>>()
  for (const map of maps) {
    const imageUri = map.resource.id
    const imageMaps = mapsByImage.get(imageUri) ?? new Map()
    // Match the save endpoint, which derives IDs from content and ignores input IDs.
    const mapId = await generateChecksum({ ...map, id: undefined })
    imageMaps.set(mapId, map)
    mapsByImage.set(imageUri, imageMaps)
  }

  return Promise.all(
    [...mapsByImage].map(async ([imageUri, imageMaps]) => {
      const maps = [...imageMaps.values()]
      return {
        imageId: await generateId(imageUri),
        imageUri,
        maps,
        exceedsSaveLimit:
          new TextEncoder().encode(JSON.stringify(maps)).length >
          MAP_IMPORT_SAVE_REQUEST_LIMIT
      }
    })
  )
}
