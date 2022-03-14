import { validateMap, validateMaps } from './lib/validators.js'
import { ValidationError } from './lib/errors.js'

const motivation = 'georeferencing'
const purpose = 'gcp-georeferencing'

const context = [
  'http://www.w3.org/ns/anno.jsonld',
  'http://geojson.org/geojson-ld/geojson-context.jsonld',
  'http://iiif.io/api/presentation/3/context.json'
]

function createSvgSelector(width, height, mask) {
  return {
    type: 'SvgSelector',
    value: `<svg width="${width}" height="${height}"><polygon points="${mask
      .map((point) => point.join(','))
      .join(' ')}" /></svg>`
  }
}

function createMapAnnotation(map, includeContext = true) {
  const region = 'full'
  const imageQuality = map.image.quality || 'default'
  const imageFormat = map.image.format || 'jpg'
  const imageVersion = map.image.version || 2

  let size
  if (imageVersion <= 2) {
    size = 'full'
  } else {
    size = 'max'
  }

  const sourceSuffix = `/${region}/${size}/0/${imageQuality}.${imageFormat}`
  const source = `${map.image.uri}${sourceSuffix}`

  let body
  if (map.gcps) {
    body = {
      type: 'FeatureCollection',
      purpose,
      transformation: {
        type: 'polynomial',
        order: 0
      },
      features: map.gcps.map((gcp) => {
        const feature = {
          type: 'Feature',

          properties: {
            pixelCoords: gcp.image
          },
          geometry: {
            type: 'Point',
            coordinates: gcp.world
          }
        }

        if (gcp.id) {
          feature.id = gcp.id
        }

        return feature
      })
    }
  }

  let target = {
    type: 'Image',
    source,
    service: [
      {
        '@id': map.image.uri,
        type: `ImageService${imageVersion}`,
        profile: map.image.profile
      }
    ]
  }

  if (map.pixelMask) {
    target = {
      ...target,
      selector: createSvgSelector(
        map.image.width,
        map.image.height,
        map.pixelMask
      )
    }
  }

  const annotation = {
    type: 'Annotation',
    motivation,
    target,
    body
  }

  if (map.id) {
    annotation.id = map.id
  }

  if (includeContext) {
    annotation['@context'] = context
  }

  return annotation
}

/**
 * Generates a {@link Annotation georeference annotation} from a single {@link Map map} or an array of {@link Map maps}.
 * @param {Map | Map[]} mapOrMaps - Single map object, or array of maps
 * @returns {Annotation} Georeference annotation
 * @example
 * import fs from 'fs'
 * import { generateAnnotation } from '@allmaps/annotation'
 *
 * const map = JSON.parse(fs.readFileSync('./examples/map.example.json'))
 * const annotation = generateAnnotation(map)
 */
export function generateAnnotation(mapOrMaps) {
  if (Array.isArray(mapOrMaps)) {
    const maps = mapOrMaps

    if (!validateMaps(maps)) {
      throw new ValidationError('Maps', validateMaps.errors)
    }

    const annotations = maps.map((map) => createMapAnnotation(map, false))

    return {
      type: 'AnnotationPage',
      '@context': context,
      items: annotations
    }
  } else {
    const map = mapOrMaps

    if (!validateMap(map)) {
      throw new ValidationError('Map', validateMap.errors)
    }

    return createMapAnnotation(map, true)
  }
}
