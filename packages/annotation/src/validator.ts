import { z } from 'zod'

import {
  Annotation0Schema,
  Annotation1Schema,
  AnnotationPage0Schema,
  AnnotationPage1Schema,
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema
} from './schemas/annotation.js'

import {
  Map1Schema,
  Maps1Schema,
  Map2Schema,
  Maps2Schema,
  MapAllVersionsSchema,
  MapsAllVersionsSchema
} from './schemas/map.js'

import { toAnnotation1, toAnnotationPage1, toMap2, toMaps2 } from './convert.js'
import {
  isAnnotationPageBeforeParse,
  isAnnotation0BeforeParse,
  isMapsBeforeParse,
  isMap2BeforeParse
} from './before-parse.js'

type Annotation1 = z.infer<typeof Annotation1Schema>
type AnnotationAllVersions = z.infer<typeof AnnotationAllVersionsSchema>
type AnnotationPage1 = z.infer<typeof AnnotationPage1Schema>
type AnnotationPageAllVersions = z.infer<typeof AnnotationPageAllVersionsSchema>

type Map2 = z.infer<typeof Map2Schema>
type MapAllVersions = z.infer<typeof MapAllVersionsSchema>
type Maps2 = z.infer<typeof Maps2Schema>
type MapsAllVersions = z.infer<typeof MapsAllVersionsSchema>

export function validateAnnotation(
  annotation: unknown
): Annotation1 | AnnotationPage1 {
  if (isAnnotationPageBeforeParse(annotation)) {
    // Seperate .parse for different versions for better Zod errors
    let parsedAnnotationPage: AnnotationPageAllVersions
    if (
      'items' in annotation &&
      Array.isArray(annotation.items) &&
      isAnnotation0BeforeParse(annotation.items[0])
    ) {
      parsedAnnotationPage = AnnotationPage0Schema.parse(annotation)
    } else {
      parsedAnnotationPage = AnnotationPage1Schema.parse(annotation)
    }

    return toAnnotationPage1(parsedAnnotationPage)
  } else {
    // Seperate .parse for different versions for better Zod errors
    let parsedAnnotation: AnnotationAllVersions
    if (isAnnotation0BeforeParse(annotation)) {
      parsedAnnotation = Annotation0Schema.parse(annotation)
    } else {
      parsedAnnotation = Annotation1Schema.parse(annotation)
    }

    return toAnnotation1(parsedAnnotation)
  }
}

export function validateMap(mapOrMaps: unknown): Map2 | Maps2 {
  if (isMapsBeforeParse(mapOrMaps)) {
    // Seperate .parse for different versions for better Zod errors
    let parsedMaps: MapsAllVersions
    if (isMap2BeforeParse(mapOrMaps[0])) {
      parsedMaps = Maps2Schema.parse(mapOrMaps)
    } else {
      parsedMaps = Maps1Schema.parse(mapOrMaps)
    }

    return toMaps2(parsedMaps)
  } else {
    // Seperate .parse for different versions for better Zod errors
    let parsedMap: MapAllVersions
    if (isMap2BeforeParse(mapOrMaps)) {
      parsedMap = Map2Schema.parse(mapOrMaps)
    } else {
      parsedMap = Map1Schema.parse(mapOrMaps)
    }

    return toMap2(parsedMap)
  }
}
