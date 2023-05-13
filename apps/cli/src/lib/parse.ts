import { parseAnnotation, validateMap } from '@allmaps/annotation'

import type { Map } from '@allmaps/annotation'

export function parseAnnotationValidateMap(jsonValue: unknown): Map[] | Map {
  if (
    jsonValue &&
    typeof jsonValue === 'object' &&
    'type' in jsonValue &&
    (jsonValue.type === 'Annotation' || jsonValue.type === 'AnnotationPage')
  ) {
    return parseAnnotation(jsonValue)
  } else {
    return validateMap(jsonValue)
  }
}

export function parseAnnotationsValidateMaps(jsonValues: unknown[]): Map[] {
  const maps = jsonValues.map(parseAnnotationValidateMap).flat()

  return maps
}
