import { z } from 'zod'

import { ImageServiceSchema, ResourceMaskSchema } from './schemas/shared.js'
import {
  Map1Schema,
  Map2Schema,
  Maps1Schema,
  Maps2Schema,
  MapAllVersionsSchema,
  MapsAllVersionsSchema,
  GCPAllVersionsSchema
} from './schemas/map.js'
import {
  Annotation1Schema,
  AnnotationPage1Schema,
  SvgSelector1Schema,
  TransformationSchema,
  PartOfSchema
} from './schemas/annotation.js'

import { isMapsBeforeParse, isMap2BeforeParse } from './before-parse.js'
import { isMap2 } from './guards.js'

type ImageService = z.infer<typeof ImageServiceSchema>

type MapAllVersions = z.infer<typeof MapAllVersionsSchema>
type MapsAllVersions = z.infer<typeof MapsAllVersionsSchema>
type ResourceMask = z.infer<typeof ResourceMaskSchema>
type GCP = z.infer<typeof GCPAllVersionsSchema>

type Annotation1 = z.infer<typeof Annotation1Schema>
type AnnotationPage1 = z.infer<typeof AnnotationPage1Schema>
type SvgSelector1 = z.infer<typeof SvgSelector1Schema>

type Transformation = z.infer<typeof TransformationSchema>
type PartOf = z.infer<typeof PartOfSchema>

function generateSvgSelector(map: MapAllVersions): SvgSelector1 {
  let width: number
  let height: number
  let resourceMask: ResourceMask

  if (isMap2(map)) {
    width = map.resource.width
    height = map.resource.height
    resourceMask = map.resourceMask
  } else {
    width = map.image.width
    height = map.image.height
    resourceMask = map.pixelMask
  }

  return {
    type: 'SvgSelector',
    value: `<svg width="${width}" height="${height}"><polygon points="${resourceMask
      .map((point) => point.join(','))
      .join(' ')}" /></svg>`
  }
}

function generateSource(map: MapAllVersions) {
  let id: string
  let type: ImageService

  let width: number
  let height: number

  let partOf: PartOf[] | undefined

  if (isMap2(map)) {
    id = map.resource.id
    type = map.resource.type

    width = map.resource.width
    height = map.resource.height

    partOf = map.resource.partOf
  } else {
    id = map.image.uri
    type = map.image.type
    width = map.image.width
    height = map.image.height
  }

  return {
    '@id': id,
    type,
    height,
    width,
    partOf
  }
}

export function generateContext() {
  return [
    'http://iiif.io/api/extension/georef/1/context.json',
    'http://iiif.io/api/presentation/3/context.json'
  ]
}

function generateTransformation(
  map: MapAllVersions
): Transformation | undefined {
  if (isMap2(map)) {
    return map.transformation
  }
}

function generateFeature(gcp: GCP) {
  let resourceCoords: [number, number]
  let geoCoords: [number, number]

  if ('resource' in gcp) {
    resourceCoords = gcp.resource
    geoCoords = gcp.geo
  } else {
    resourceCoords = gcp.image
    geoCoords = gcp.world
  }

  return {
    type: 'Feature' as const,
    properties: {
      resourceCoords
    },
    geometry: {
      type: 'Point' as const,
      coordinates: geoCoords
    }
  }
}

function generateGeoreferenceAnnotation(map: MapAllVersions): Annotation1 {
  const target = {
    type: 'SpecificResource' as const,
    source: generateSource(map),
    selector: generateSvgSelector(map)
  }

  const body = {
    type: 'FeatureCollection' as const,
    transformation: generateTransformation(map),
    features: map.gcps.map((gcp) => generateFeature(gcp))
  }

  return {
    id: map.id,
    type: 'Annotation',
    '@context': generateContext(),
    motivation: 'georeferencing' as const,
    target,
    body
  }
}

/**
 * Generates a {@link Annotation Georeference Annotation} from a single {@link Map map} or
 * an {@link AnnotationPage AnnotationPage} containing multiple Georeference Annotations from an array of {@link Map maps}.
 * @param {Map | Map[]} mapOrMaps - Single map object, or array of maps
 * @returns {Annotation | AnnotationPage} Georeference Annotation
 * @example
 * import fs from 'fs'
 * import { generateAnnotation } from '@allmaps/annotation'
 *
 * const map = JSON.parse(fs.readFileSync('./examples/map.example.json'))
 * const annotation = generateAnnotation(map)
 */
export function generateAnnotation(
  mapOrMaps: unknown
): Annotation1 | AnnotationPage1 {
  if (isMapsBeforeParse(mapOrMaps)) {
    // Seperate .parse for different versions for better Zod errors
    let parsedMaps: MapsAllVersions
    if (isMap2BeforeParse(mapOrMaps[0])) {
      parsedMaps = Maps2Schema.parse(mapOrMaps)
    } else {
      parsedMaps = Maps1Schema.parse(mapOrMaps)
    }

    const annotations = parsedMaps.map((parsedMap) =>
      generateGeoreferenceAnnotation(parsedMap)
    )

    return {
      type: 'AnnotationPage',
      '@context': ['http://www.w3.org/ns/anno.jsonld'],
      items: annotations
    }
  } else {
    // Seperate .parse for different versions for better Zod errors
    let parsedMap: MapAllVersions
    if (isMap2BeforeParse(mapOrMaps)) {
      parsedMap = Map2Schema.parse(mapOrMaps)
    } else {
      parsedMap = Map1Schema.parse(mapOrMaps)
    }

    return generateGeoreferenceAnnotation(parsedMap)
  }
}
