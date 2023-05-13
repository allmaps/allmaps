import { z } from 'zod'

import { AnnotationSchema, AnnotationPageSchema } from './schemas/annotation.js'

import { MapSchema, PixelMaskSchema, GCPSchema } from './schemas/map.js'

type Annotation = z.infer<typeof AnnotationSchema>

type Map = z.infer<typeof MapSchema>
type PixelMask = z.infer<typeof PixelMaskSchema>
type GCP = z.infer<typeof GCPSchema>

function getGcps(annotation: Annotation): GCP[] {
  return annotation.body.features.map((gcpFeature) => ({
    image: gcpFeature.properties.pixelCoords,
    world: gcpFeature.geometry.coordinates
  }))
}

function getImageDimensions(annotation: Annotation): {
  width: number
  height: number
} {
  const selector = annotation.target.selector

  const svg = selector.value

  const widthResult = /width="(?<width>\d+)"/.exec(svg)
  const heightResult = /height="(?<height>\d+)"/.exec(svg)

  const width = widthResult?.groups?.width
  const height = heightResult?.groups?.height

  if (!width || !height) {
    throw new Error('Could not parse image dimensions')
  }

  return {
    width: parseInt(width),
    height: parseInt(height)
  }
}

function getImageUri(annotation: Annotation): string {
  return annotation.target.service[0]['@id']
}

function getPixelMask(annotation: Annotation): PixelMask {
  const selector = annotation.target.selector
  const svg = selector.value

  const result = /points="(?<points>.+)"/.exec(svg)
  const groups = result?.groups

  if (groups && groups.points) {
    const pointStrings = groups.points.trim().split(/\s+/)

    if (pointStrings.length >= 3) {
      return pointStrings.map((point: string) => {
        const numberStrings = point.split(',')

        if (numberStrings.length === 2) {
          return [parseFloat(numberStrings[0]), parseFloat(numberStrings[1])]
        } else {
          throw new Error('Could not parse pixel mask')
        }
      })
    } else {
      throw new Error('Could not parse pixel mask')
    }
  } else {
    throw new Error('Could not parse pixel mask')
  }
}

function getMap(annotation: Annotation): Map {
  return {
    id: annotation.id,
    version: 1,
    image: {
      uri: getImageUri(annotation),
      // TODO: determine type
      type: 'ImageService2',
      ...getImageDimensions(annotation)
    },
    pixelMask: getPixelMask(annotation),
    gcps: getGcps(annotation)
  }
}

/**
 *
 * Parses a {@link Annotation georeference annotation} and returns an array of {@link Map maps}.
 * @param {Annotation} annotation - Georeference annotation
 * @returns {Map[]} Array of maps
 * @example
 * import fs from 'fs'
 * import { parseAnnotation } from '@allmaps/annotation'
 *
 * const annotation = JSON.parse(fs.readFileSync('./examples/annotation.example.json'))
 * const maps = parseAnnotation(annotation)
 */
export function parseAnnotation(annotation: unknown): Map[] {
  if (
    annotation &&
    typeof annotation === 'object' &&
    'type' in annotation &&
    annotation.type === 'AnnotationPage'
  ) {
    // eslint-disable-next-line no-useless-catch
    try {
      const parsedAnnotationPage = AnnotationPageSchema.parse(annotation)

      return parsedAnnotationPage.items.map((parsedAnnotation) =>
        getMap(parsedAnnotation)
      )
    } catch (err) {
      // TODO: handle errors
      throw err
    }
  } else {
    // eslint-disable-next-line no-useless-catch
    try {
      const parsedAnnotation = AnnotationSchema.parse(annotation)

      return [getMap(parsedAnnotation)]
    } catch (err) {
      throw err
    }
  }
}
