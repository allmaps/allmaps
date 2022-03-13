import { validateMap } from './lib/validators.js'
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

function createMapAnnotation(map, index, includeContext = true) {
  if (!validateMap(map)) {
    throw new ValidationError('map', validateMap.errors, index)
  }

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
      features: map.gcps.map((gcp) => ({
        type: 'Feature',
        id: gcp.id,
        properties: {
          pixelCoords: gcp.image || null
        },
        geometry: gcp.world
          ? {
              type: 'Point',
              coordinates: gcp.world
            }
          : null
      }))
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
    id: map.id,
    motivation,
    target,
    body
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
  let maps

  if (Array.isArray(mapOrMaps)) {
    maps = mapOrMaps
  } else {
    maps = [mapOrMaps]
  }

  if (maps.length === 0) {
    throw new Error('No maps provided')
  }

  const annotations = maps
    .map((map, index) => createMapAnnotation(map, index, maps.length === 1))

  if (maps.length === 1) {
    return annotations[0]
  } else {
    return {
      type: 'AnnotationPage',
      '@context': context,
      items: annotations
    }
  }
}
