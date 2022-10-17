import { parseAnnotation, validateMap } from '@allmaps/annotation'

import type { Map } from '@allmaps/annotation'

export function parseAnnotationValidateMap(jsonValue: any): Map[] | Map {
  if (jsonValue.type === 'Annotation' || jsonValue.type === 'AnnotationPage') {
    return parseAnnotation(jsonValue)
  } else {
    return validateMap(jsonValue)
  }
}

export function parseAnnotationsValidateMaps(jsonValues: any[]): Map[] {
  const maps = jsonValues.map(parseAnnotationValidateMap).flat()

  return maps
}
