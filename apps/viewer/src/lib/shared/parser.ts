import { IIIF } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'

import type { Parsed } from '$lib/shared/types.js'

export async function parseJson(json: unknown): Promise<Parsed> {
  try {
    const maps = parseAnnotation(json)
    return {
      type: 'annotation',
      maps
    }
  } catch (err) {
    // json is not a valid Georeference Annotation
    // Try iiif-parser instead
  }

  try {
    const parsedIiif = IIIF.parse(json)
    return {
      type: 'iiif',
      iiif: parsedIiif
    }
  } catch (err) {
    throw err
  }
}
