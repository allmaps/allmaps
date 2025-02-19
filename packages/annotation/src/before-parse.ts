export function isGeoreferencedMapsBeforeParse(
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
    annotation.type === 'AnnotationPage' &&
    'items' in annotation
  ) {
    return true
  } else {
    return false
  }
}

export function isGeoreferencedMap2BeforeParse(
  georeferencedMap: unknown
): georeferencedMap is {
  type: 'GeoreferencedMap'
} {
  if (
    georeferencedMap &&
    typeof georeferencedMap === 'object' &&
    'type' in georeferencedMap &&
    georeferencedMap.type === 'GeoreferencedMap'
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
