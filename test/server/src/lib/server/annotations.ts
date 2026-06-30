import { cloneJsonObject, localizeFixtureUrls } from '../paths.ts'
import type { JsonObject } from '../types.ts'
import type { ImageFixture } from './fixture-data.ts'

export function getEmbeddedAnnotationErrorVariant(variant: string) {
  if (variant === 'embedded-annotation-missing-target') {
    return 'missing-target'
  }

  if (variant === 'embedded-annotation-one-gcp') {
    return 'one-gcp'
  }

  if (variant === 'embedded-annotation-mixed-errors') {
    return 'mixed-errors'
  }

  return undefined
}

export function getLinkedAnnotationErrorVariant(variant: string) {
  if (variant === 'linked-annotation-missing-target') {
    return 'missing-target'
  }

  if (variant === 'linked-annotation-one-gcp') {
    return 'one-gcp'
  }

  if (variant === 'linked-annotation-mixed-errors') {
    return 'mixed-errors'
  }

  return undefined
}

export function isEmbeddedAnnotationVariant(variant: string) {
  return (
    variant === 'embedded-annotation' ||
    getEmbeddedAnnotationErrorVariant(variant) !== undefined
  )
}

export function isLinkedAnnotationVariant(variant: string) {
  return (
    variant === 'linked-annotation' ||
    getLinkedAnnotationErrorVariant(variant) !== undefined
  )
}

export function getCombinedAnnotationErrorVariant(index: number) {
  return ['one-gcp', 'bad-resource-size', 'missing-target'][index % 3] as string
}

export function shouldBreakCombinedAnnotation(variant: string, index: number) {
  return (
    (variant === 'mixed-errors' ||
      variant === 'mixed-cors-errors' ||
      variant === 'mixed-errors-iiif3-level2' ||
      variant === 'mixed-cors-errors-iiif3-level2') &&
    index % 2 === 1
  )
}

export function createBrokenAnnotation(
  annotation: unknown,
  baseUrl: string,
  image: ImageFixture,
  variant: string
) {
  const localizedAnnotation = localizeFixtureUrls(annotation, baseUrl)
  const brokenAnnotation = cloneJsonObject(localizedAnnotation)
  const maps = Array.isArray(brokenAnnotation.items)
    ? brokenAnnotation.items.map((item) => cloneJsonObject(item))
    : []

  if (variant === 'mixed-errors') {
    return {
      ...brokenAnnotation,
      items: maps.map((map, index) =>
        index % 2 === 0
          ? map
          : createBrokenAnnotationMap(
              map,
              image,
              getCombinedAnnotationErrorVariant(index)
            )
      )
    }
  }

  const firstMap = maps[0] ?? {}

  return {
    ...brokenAnnotation,
    items: [createBrokenAnnotationMap(firstMap, image, variant)]
  }
}

export function createBrokenAnnotationMap(
  map: JsonObject,
  image: ImageFixture,
  variant: string
) {
  const brokenMap = cloneJsonObject(map)

  if (variant === 'missing-target') {
    delete brokenMap.target
  } else if (variant === 'bad-resource-size') {
    const target = cloneJsonObject(brokenMap.target)
    const source = cloneJsonObject(target.source)

    brokenMap.target = {
      ...target,
      source: {
        ...source,
        width: image.width * -1,
        height: 'unknown'
      }
    }
  } else if (variant === 'one-gcp') {
    const body = cloneJsonObject(brokenMap.body)

    brokenMap.body = {
      ...body,
      features: Array.isArray(body.features) ? body.features.slice(0, 1) : []
    }
  } else {
    throw new Error(`Unknown annotation error variant: ${variant}`)
  }

  return brokenMap
}
