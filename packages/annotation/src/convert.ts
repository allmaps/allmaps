import { parseAnnotation } from './parser.js'
import { generateAnnotation } from './generator.js'

import { isAnnotation1, isGeoreferencedMap2 } from './guards.js'

import type {
  Annotation1,
  AnnotationPage1,
  AnnotationAllVersions,
  AnnotationPageAllVersions,
  GeoreferencedMap2,
  GeoreferencedMaps2,
  GeoreferencedMapAllVersions,
  GeoreferencedMapsAllVersions
} from './types.js'

export function toAnnotation1(annotation: AnnotationAllVersions): Annotation1 {
  if (isAnnotation1(annotation)) {
    return annotation
  } else {
    const convertedAnnotation = generateAnnotation(parseAnnotation(annotation))

    if ('items' in convertedAnnotation) {
      return convertedAnnotation.items[0]
    } else {
      return convertedAnnotation
    }
  }
}

export function toAnnotationPage1(
  annotationPage: AnnotationPageAllVersions
): AnnotationPage1 {
  return {
    ...annotationPage,
    items: annotationPage.items.map(toAnnotation1)
  }
}

export function toGeoreferencedMap2(
  georeferencedMap: GeoreferencedMapAllVersions
): GeoreferencedMap2 {
  if (isGeoreferencedMap2(georeferencedMap)) {
    return georeferencedMap
  } else {
    const convertedMap = parseAnnotation(generateAnnotation(georeferencedMap))
    return convertedMap[0]
  }
}

export function toGeoreferencedMaps2(
  georeferencedMap: GeoreferencedMapsAllVersions
): GeoreferencedMaps2 {
  return georeferencedMap.map(toGeoreferencedMap2)
}
