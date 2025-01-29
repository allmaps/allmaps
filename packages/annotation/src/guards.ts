import type {
  AnnotationAllVersions,
  MapAllVersions,
  Annotation1,
  Map2
} from './types.js'

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
