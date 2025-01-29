import { parseAnnotation } from './parser.js'
import { generateAnnotation } from './generator.js'

import { isAnnotation1, isMap2 } from './guards.js'

import type {
  Annotation1,
  AnnotationPage1,
  AnnotationAllVersions,
  AnnotationPageAllVersions,
  Map2,
  Maps2,
  MapAllVersions,
  MapsAllVersions
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

export function toMap2(map: MapAllVersions): Map2 {
  if (isMap2(map)) {
    return map
  } else {
    const convertedMap = parseAnnotation(generateAnnotation(map))
    return convertedMap[0]
  }
}

export function toMaps2(maps: MapsAllVersions): Maps2 {
  return maps.map(toMap2)
}
