import type {
  AnnotationAllVersions,
  GeoreferencedMapAllVersions,
  Annotation1,
  GeoreferencedMap2
} from './types.js'

// Type guard that checks if georeferencedMap is v2 GeoreferencedMap
export function isGeoreferencedMap2(
  georeferencedMap: GeoreferencedMapAllVersions
): georeferencedMap is GeoreferencedMap2 {
  return (
    'type' in georeferencedMap && georeferencedMap.type === 'GeoreferencedMap'
  )
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
