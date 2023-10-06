import { z } from 'zod'

import { MapAllVersionsSchema, Map2Schema } from './schemas/map.js'
import {
  AnnotationAllVersionsSchema,
  Annotation1Schema
} from './schemas/annotation.js'

type AnnotationAllVersions = z.infer<typeof AnnotationAllVersionsSchema>
type MapAllVersions = z.infer<typeof MapAllVersionsSchema>

type Annotation1 = z.infer<typeof Annotation1Schema>
type Map2 = z.infer<typeof Map2Schema>

// Type guard that checks if map is v2 Map
export function isMap2(map: MapAllVersions): map is Map2 {
  return 'type' in map && map.type === 'GeoreferencedMap'
}

// Type guard that checks if annotation is v1 Georeference Annotation
export function isAnnotation1(
  annotation: AnnotationAllVersions
): annotation is Annotation1 {
  return (
    'source' in annotation.target &&
    typeof annotation.target.source === 'object'
  )
}
