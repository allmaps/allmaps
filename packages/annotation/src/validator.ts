import {
  Annotation0Schema,
  Annotation1Schema,
  AnnotationPage0Schema,
  AnnotationPage1Schema
} from './schemas/annotation.js'

import {
  GeoreferencedMap1Schema,
  GeoreferencedMaps1Schema,
  GeoreferencedMap2Schema,
  GeoreferencedMaps2Schema
} from './schemas/georeferenced-map.js'

import {
  toAnnotation1,
  toAnnotationPage1,
  toGeoreferencedMap2,
  toGeoreferencedMaps2
} from './convert.js'
import {
  isAnnotationPageBeforeParse,
  isAnnotation0BeforeParse,
  isGeoreferencedMapsBeforeParse,
  isGeoreferencedMap2BeforeParse
} from './before-parse.js'

import type {
  Annotation1,
  AnnotationAllVersions,
  AnnotationPage1,
  AnnotationPageAllVersions,
  GeoreferencedMap2,
  GeoreferencedMapAllVersions,
  GeoreferencedMapsAllVersions
} from './types.js'

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

export function validateGeoreferencedMap(
  mapOrMaps: unknown
): GeoreferencedMap2 | GeoreferencedMap2[] {
  if (isGeoreferencedMapsBeforeParse(mapOrMaps)) {
    // Seperate .parse for different versions for better Zod errors
    let parsedGeoreferencedMaps: GeoreferencedMapsAllVersions
    if (isGeoreferencedMap2BeforeParse(mapOrMaps[0])) {
      parsedGeoreferencedMaps = GeoreferencedMaps2Schema.parse(mapOrMaps)
    } else {
      parsedGeoreferencedMaps = GeoreferencedMaps1Schema.parse(mapOrMaps)
    }

    return toGeoreferencedMaps2(parsedGeoreferencedMaps)
  } else {
    // Seperate .parse for different versions for better Zod errors
    let parsedGeoreferencedMap: GeoreferencedMapAllVersions
    if (isGeoreferencedMap2BeforeParse(mapOrMaps)) {
      parsedGeoreferencedMap = GeoreferencedMap2Schema.parse(mapOrMaps)
    } else {
      parsedGeoreferencedMap = GeoreferencedMap1Schema.parse(mapOrMaps)
    }

    return toGeoreferencedMap2(parsedGeoreferencedMap)
  }
}
