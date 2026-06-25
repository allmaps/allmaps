import { readFileSync } from 'node:fs'

import { parseAnnotation } from '@allmaps/annotation'
import { IIIF, Manifest } from '@allmaps/iiif-parser'

import {
  loadImageDefinitions,
  type ImageFixtureDefinition
} from '../fixtures.ts'
import { cloneJsonObject } from '../paths.ts'
import type { JsonObject } from '../types.ts'

export type ImageFixture = ImageFixtureDefinition

const imageDefinitions = loadImageDefinitions()

const images = new Map(imageDefinitions.map((image) => [image.id, image]))
const originalManifests = new Map(
  imageDefinitions.flatMap((image) => {
    if (!image.originalManifestPath) {
      return []
    }

    const originalManifest = JSON.parse(
      readFileSync(image.originalManifestPath, 'utf8')
    )
    const parsedManifest = IIIF.parse(originalManifest, {
      keepSource: true
    })

    if (!(parsedManifest instanceof Manifest)) {
      throw new Error(`${image.originalManifestPath} is not a IIIF manifest`)
    }

    return [
      [
        image.id,
        {
          parsedManifest,
          source: originalManifest
        }
      ] as const
    ]
  })
)

export function getImage(imageId: string) {
  const image = images.get(imageId)

  if (!image) {
    throw new Error(`Unknown image fixture: ${imageId}`)
  }

  return image
}

export function getImages() {
  return [...images.values()]
}

export function getOriginalManifest(image: ImageFixture) {
  return originalManifests.get(image.id)
}

export function getGeoreferencedMap(image: ImageFixture) {
  const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))
  const maps = parseAnnotation(annotation)
  const map = maps[0]

  if (!map) {
    throw new Error(`No georeferenced map found for ${image.id}`)
  }

  return map
}

export function hasMultipleMapAnnotations(image: ImageFixture) {
  const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))

  return Array.isArray(annotation.items) && annotation.items.length > 1
}

export function getFirstCanvas(sourceManifest: JsonObject) {
  return cloneJsonObject(sourceManifest.sequences?.[0]?.canvases?.[0])
}

export function getFirstImageAnnotation(sourceManifest: JsonObject) {
  return cloneJsonObject(
    sourceManifest.sequences?.[0]?.canvases?.[0]?.images?.[0]
  )
}

export function getFirstImageResource(sourceManifest: JsonObject) {
  return cloneJsonObject(
    sourceManifest.sequences?.[0]?.canvases?.[0]?.images?.[0]?.resource
  )
}
