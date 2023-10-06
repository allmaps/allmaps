import { z } from 'zod'

import {
  Annotation1Schema,
  AnnotationPage1Schema,
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema
} from './schemas/annotation.js'

import {
  Map2Schema,
  Maps2Schema,
  MapAllVersionsSchema,
  MapsAllVersionsSchema
} from './schemas/map.js'

import { parseAnnotation } from './parser.js'
import { generateAnnotation } from './generator.js'

import { isAnnotation1, isMap2 } from './guards.js'

type Annotation1 = z.infer<typeof Annotation1Schema>
type AnnotationPage1 = z.infer<typeof AnnotationPage1Schema>

type AnnotationAllVersions = z.infer<typeof AnnotationAllVersionsSchema>
type AnnotationPageAllVersions = z.infer<typeof AnnotationPageAllVersionsSchema>

type Map2 = z.infer<typeof Map2Schema>
type Maps2 = z.infer<typeof Maps2Schema>

type MapAllVersions = z.infer<typeof MapAllVersionsSchema>
type MapsAllVersions = z.infer<typeof MapsAllVersionsSchema>

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
