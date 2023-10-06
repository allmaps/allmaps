export function isMapsBeforeParse(
  mapOrMaps: unknown
): mapOrMaps is Array<unknown> {
  return Array.isArray(mapOrMaps)
}

export function isAnnotationPageBeforeParse(
  annotation: unknown
): annotation is {
  type: 'AnnotationPage'
  items: unknown[]
} {
  if (
    annotation &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    annotation.type === 'AnnotationPage'
    // &&
    // 'items' in annotation
  ) {
    return true
  } else {
    return false
  }
}

export function isMap2BeforeParse(map: unknown): map is {
  type: 'GeoreferencedMap'
} {
  if (
    map &&
    typeof map === 'object' &&
    'type' in map &&
    map.type === 'GeoreferencedMap'
  ) {
    return true
  } else {
    return false
  }
}

export function isAnnotation0BeforeParse(annotation: unknown): annotation is {
  target: {
    source: string
  }
} {
  if (
    annotation &&
    typeof annotation === 'object' &&
    'target' in annotation &&
    annotation.target &&
    typeof annotation.target === 'object' &&
    'source' in annotation.target &&
    typeof annotation.target.source === 'string'
  ) {
    return true
  } else {
    return false
  }
}

// export function isAnnotationPage(
//   annotationOrAnnotationPage: AnnotationAllVersions | AnnotationPageAllVersions
// ): annotationOrAnnotationPage is AnnotationPageAllVersions {}

// annotation &&
//   typeof annotation === 'object' &&
//   'type' in annotation &&
//   annotation.type === 'AnnotationPage'

// isMaps
// Array.isArray(mapOrMaps)
// Array.isArray(mapOrMaps)
