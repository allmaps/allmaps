import { z } from 'zod'

import { ImageServiceSchema } from './schemas/shared.js'
import { MapSchema, MapsSchema, PixelMaskSchema } from './schemas/map.js'
import {
  AnnotationSchema,
  AnnotationPageSchema,
  SvgSelectorSchema
} from './schemas/annotation.js'

type ImageService = z.infer<typeof ImageServiceSchema>

type Map = z.infer<typeof MapSchema>
type Maps = z.infer<typeof MapsSchema>
type PixelMask = z.infer<typeof PixelMaskSchema>

type Annotation = z.infer<typeof AnnotationSchema>
type AnnotationPage = z.infer<typeof AnnotationPageSchema>
type SvgSelector = z.infer<typeof SvgSelectorSchema>

const motivation = 'georeferencing' as const

const context = [
  'http://www.w3.org/ns/anno.jsonld',
  'http://geojson.org/geojson-ld/geojson-context.jsonld',
  'http://iiif.io/api/presentation/3/context.json'
]

function generateSvgSelector(
  width: number,
  height: number,
  mask: PixelMask
): SvgSelector {
  return {
    type: 'SvgSelector',
    value: `<svg width="${width}" height="${height}"><polygon points="${mask
      .map((point) => point.join(','))
      .join(' ')}" /></svg>`
  }
}

function generateGeorefAnnotation(map: Map): Annotation {
  const region = 'full'
  const imageQuality = 'default'
  const imageFormat = 'jpg'

  let size
  if (map.image.type === 'ImageService2') {
    size = 'full'
  } else {
    size = 'max'
  }

  const sourceSuffix = `/${region}/${size}/0/${imageQuality}.${imageFormat}`
  const source = `${map.image.uri}${sourceSuffix}`

  const body = {
    type: 'FeatureCollection' as const,
    transformation: {
      type: 'polynomial',
      options: {
        order: 1
      }
    },
    features: map.gcps.map((gcp) => ({
      type: 'Feature' as const,
      properties: {
        pixelCoords: gcp.image
      },
      geometry: {
        type: 'Point' as const,
        coordinates: gcp.world
      }
    }))
  }

  const target = {
    type: 'Image' as const,
    source,
    service: [
      {
        '@id': map.image.uri,
        type: map.image.type as ImageService
        // profile: map.image.profile
      }
    ],
    selector: generateSvgSelector(
      map.image.width,
      map.image.height,
      map.pixelMask
    )
  }

  return {
    id: map.id,
    type: 'Annotation',
    '@context': context,
    motivation,
    target,
    body
  }
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
export function generateAnnotation(
  mapOrMaps: any
): Annotation | AnnotationPage {
  if (Array.isArray(mapOrMaps)) {
    // eslint-disable-next-line no-useless-catch
    try {
      const maps = MapsSchema.parse(mapOrMaps)

      const annotations = maps.map((map) => generateGeorefAnnotation(map))

      return {
        type: 'AnnotationPage',
        '@context': ['http://www.w3.org/ns/anno.jsonld'],
        items: annotations
      }
    } catch (err) {
      throw err
    }
  } else {
    // eslint-disable-next-line no-useless-catch
    try {
      const map = MapSchema.parse(mapOrMaps)

      return generateGeorefAnnotation(map)
    } catch (err) {
      throw err
    }
  }
}
