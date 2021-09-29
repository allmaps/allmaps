const motivation = 'georeferencing'
const purpose = 'gcp-georeferencing'

function createSvgSelector (width, height, mask) {
  return {
    type: 'SvgSelector',
    value: `<svg width="${width}" height="${height}"><polygon points="${mask.map((point) => point.join(',')).join(' ')}" /></svg>`
  }
}

function createMapAnnotation (map, options) {
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
        geometry: gcp.world ? {
          type: 'Point',
          coordinates: gcp.world
        } : null
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
      selector: createSvgSelector(map.image.width, map.image.height, map.pixelMask)
    }
  }

  let annotationId
  if (options.idToUri) {
    annotationId = options.idToUri(map.id)
  }

  return {
    type: 'Annotation',
    id: annotationId,
    '@context': [
      'http://www.w3.org/ns/anno.jsonld',
      'http://geojson.org/geojson-ld/geojson-context.jsonld',
      'http://iiif.io/api/presentation/3/context.json'
    ],
    motivation,
    target,
    body
  }
}

export function generate (maps, options) {
  options = options || {}

  if (!maps || maps.length === 0) {
    return {
      type: 'Annotation',
      '@context': [
        'http://geojson.org/geojson-ld/geojson-context.jsonld',
        'http://iiif.io/api/presentation/3/context.json'
      ],
      motivation,
      target: null,
      body: null
    }
  }

  const annotations = maps
    .map((map) => createMapAnnotation(map, options))

  if (annotations.length === 1) {
    return annotations[0]
  } else if (annotations.length > 1) {
    return {
      type: 'AnnotationPage',
      '@context': [
        'http://geojson.org/geojson-ld/geojson-context.jsonld',
        'http://iiif.io/api/presentation/3/context.json'
      ],
      items: annotations
    }
  }
}
