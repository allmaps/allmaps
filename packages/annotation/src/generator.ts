import {
  GeoreferencedMap1Schema,
  GeoreferencedMap2Schema,
  GeoreferencedMaps1Schema,
  GeoreferencedMaps2Schema
} from './schemas/georeferenced-map.js'

import {
  isGeoreferencedMapsBeforeParse,
  isGeoreferencedMap2BeforeParse
} from './before-parse.js'
import { isGeoreferencedMap2 } from './guards.js'

import type {
  GeoreferencedMapAllVersions,
  GeoreferencedMapsAllVersions,
  ResourceMask,
  GCP,
  Annotation1,
  AnnotationPage1,
  SvgSelector,
  Target,
  Source,
  PartOf,
  ResourceType
} from './types.js'

function generateSvgSelector(
  georeferencedMap: GeoreferencedMapAllVersions
): SvgSelector {
  let width: number | undefined
  let height: number | undefined
  let resourceMask: ResourceMask

  if (isGeoreferencedMap2(georeferencedMap)) {
    width = georeferencedMap.resource.width
    height = georeferencedMap.resource.height
    resourceMask = georeferencedMap.resourceMask
  } else {
    width = georeferencedMap.image.width
    height = georeferencedMap.image.height
    resourceMask = georeferencedMap.pixelMask
  }

  let svg = `<svg>`
  if (width && height) {
    svg = `<svg width="${width}" height="${height}">`
  }

  return {
    type: 'SvgSelector',
    value: `${svg}<polygon points="${resourceMask
      .map((point) => point.join(','))
      .join(' ')}" /></svg>`
  }
}

function generateSource(georeferencedMap: GeoreferencedMapAllVersions): Source {
  let id: string
  let type: ResourceType

  let width: number | undefined
  let height: number | undefined

  let partOf: PartOf

  if (isGeoreferencedMap2(georeferencedMap)) {
    if (georeferencedMap.resource.type === 'Canvas') {
      // TODO: Don't know why TypeScript complains if I don't do this
      const source: Source = {
        id: georeferencedMap.resource.id,
        type: georeferencedMap.resource.type,
        height: georeferencedMap.resource.height,
        width: georeferencedMap.resource.width,
        partOf: georeferencedMap.resource.partOf
      }

      return source
    } else {
      id = georeferencedMap.resource.id
      type = georeferencedMap.resource.type
      width = georeferencedMap.resource.width
      height = georeferencedMap.resource.height
      partOf = georeferencedMap.resource.partOf
    }
  } else {
    id = georeferencedMap.image.uri
    type = georeferencedMap.image.type
    width = georeferencedMap.image.width
    height = georeferencedMap.image.height
  }

  return {
    id,
    type,
    height,
    width,
    partOf
  }
}

function generateDates(georeferencedMap: GeoreferencedMapAllVersions) {
  if (isGeoreferencedMap2(georeferencedMap)) {
    return {
      created: georeferencedMap.created,
      modified: georeferencedMap.modified
    }
  }
}

function generateContext() {
  return [
    'http://iiif.io/api/extension/georef/1/context.json',
    'http://iiif.io/api/presentation/3/context.json'
  ]
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

function generateGeoreferenceAnnotation(
  georeferencedMap: GeoreferencedMapAllVersions
): Annotation1 {
  const target: Target = {
    type: 'SpecificResource' as const,
    source: generateSource(georeferencedMap),
    selector: generateSvgSelector(georeferencedMap)
  }

  const body = {
    type: 'FeatureCollection' as const,
    transformation: georeferencedMap.transformation,
    features: georeferencedMap.gcps.map((gcp) => generateFeature(gcp))
  }

  return {
    id: georeferencedMap.id,
    type: 'Annotation',
    '@context': generateContext(),
    ...generateDates(georeferencedMap),
    motivation: 'georeferencing' as const,
    target,
    body
  }
}

/**
 * Generates a {@link Annotation Georeference Annotation} from a single {@link Map map} or
 * an {@link AnnotationPage AnnotationPage} containing multiple Georeference Annotations from an array of {@link Map maps}.
 * @param mapOrMaps - Single Georeferenced Map, or an array of Georeferenced Maps
 * @returns Georeference Annotation
 * @example
 * ```js
 * import fs from 'fs'
 * import { generateAnnotation } from '@allmaps/annotation'
 *
 * const map = JSON.parse(fs.readFileSync('./examples/map.example.json'))
 * const annotation = generateAnnotation(map)
 * ```
 */
export function generateAnnotation(
  mapOrMaps: unknown
): Annotation1 | AnnotationPage1 {
  if (isGeoreferencedMapsBeforeParse(mapOrMaps)) {
    // Seperate .parse for different versions for better Zod errors
    let parsedGeoreferencedMaps: GeoreferencedMapsAllVersions
    if (isGeoreferencedMap2BeforeParse(mapOrMaps[0])) {
      parsedGeoreferencedMaps = GeoreferencedMaps2Schema.parse(mapOrMaps)
    } else {
      parsedGeoreferencedMaps = GeoreferencedMaps1Schema.parse(mapOrMaps)
    }

    const annotations = parsedGeoreferencedMaps.map((parsedGeoreferencedMap) =>
      generateGeoreferenceAnnotation(parsedGeoreferencedMap)
    )

    return {
      type: 'AnnotationPage',
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      items: annotations
    }
  } else {
    // Seperate .parse for different versions for better Zod errors
    let parsedGeoreferencedMap: GeoreferencedMapAllVersions
    if (isGeoreferencedMap2BeforeParse(mapOrMaps)) {
      parsedGeoreferencedMap = GeoreferencedMap2Schema.parse(mapOrMaps)
    } else {
      parsedGeoreferencedMap = GeoreferencedMap1Schema.parse(mapOrMaps)
    }

    return generateGeoreferenceAnnotation(parsedGeoreferencedMap)
  }
}
