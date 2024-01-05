import { IIIF } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'

import type { ParsedSource } from '$lib/shared/types.js'

export async function parseJson(json: unknown): Promise<ParsedSource> {
  if (
    json &&
    typeof json === 'object' &&
    'type' in json &&
    (json.type === 'Annotation' || json.type === 'AnnotationPage')
  ) {
    // json is probably a Georeference Annotation
    const maps = parseAnnotation(json)
    return {
      type: 'annotation',
      maps
    }
  } else {
    // json is not a valid Georeference Annotation
    // Try iiif-parser instead
    const parsedIiif = IIIF.parse(json)
    return {
      type: 'iiif',
      iiif: parsedIiif
    }
  }
}
