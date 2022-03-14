import { validateAnnotation } from './lib/validators.js'
import { ValidationError } from './lib/errors.js'

function getGcps(annotation) {
  return annotation.body.features.map((gcpFeature) => {
    const gcp = {
      image: gcpFeature.properties.pixelCoords || null,
      world: gcpFeature.geometry ? gcpFeature.geometry.coordinates : null
    }

    if (gcpFeature.id) {
      gcp.id = gcpFeature.id
    }

    return gcp
  })
}

function getImageDimensions(annotation) {
  const selector = annotation.target.selector
  if (selector) {
    const svg = selector.value

    const {
      groups: { width }
    } = /width="(?<width>\d+)"/.exec(svg)
    const {
      groups: { height }
    } = /height="(?<height>\d+)"/.exec(svg)

    return {
      width: parseInt(width),
      height: parseInt(height)
    }
  }
}

function getImageUri(annotation) {
  return (
    annotation.target &&
    annotation.target.service &&
    annotation.target.service[0] &&
    annotation.target.service[0]['@id']
  )
}

function getPixelMask(annotation) {
  const selector = annotation.target.selector
  if (selector) {
    const svg = selector.value
    const {
      groups: { points }
    } = /points="(?<points>.+)"/.exec(svg)

    if (points) {
      return points
        .split(' ')
        .map((point) => point.split(',').map((c) => parseInt(c)))
    }
  }
}

function getMap(annotation, index) {
  if (!validateAnnotation(annotation)) {
    throw new ValidationError('annotation', validateAnnotation.errors, index)
  }

  return {
    version: 1,
    id: annotation.id,
    image: {
      uri: getImageUri(annotation),
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
export function parseAnnotation(annotation) {
  if (annotation && annotation.type === 'AnnotationPage') {
    if (annotation.items) {
      return annotation.items.map(getMap)
    } else {
      return []
    }
  } else {
    return [getMap(annotation)]
  }
}
