function svgSelector ([width, height], mask) {
  return {
    type: 'SvgSelector',
    value: `<svg width="${width}" height="${height}"><polygon points="${mask.map((point) => point.join(',')).join(' ')}" /></svg>`
  }
}

function createMapAnnotation (map) {
  // TODO: create library function, and check what
  //  quality/format is available in resource
  const sourceSuffix = '/full/full/0/default.jpg'
  const source = `${map.imageServiceId}${sourceSuffix}`

  let body
  if (map.gcps) {
    body = {
      type: 'FeatureCollection',
      features: map.gcps.map((gcp) => ({
        type: 'Feature',
        properties: {
          image: gcp.image
        },
        geometry: {
          type: 'Point',
          coordinates: gcp.world
        }
      }))
    }
  }

  let target = {
    type: 'Image',
    source,
    service: [
      {
        '@id': map.imageServiceId,
        // TODO: always 2?
        // or can we omit the type?
        type: 'ImageService2',
        profile: 'http://iiif.io/api/image/2/level2.json'
      }
    ]
  }

  if (map.pixelMask) {
    target = {
      ...target,
      selector: svgSelector(map.imageDimensions, map.pixelMask)
    }
  }

  return {
    // '@id': `https://data.allmaps.org/annotations/i/${image.id}/m/${map.id}`,
    type: 'Annotation',
    '@context': [
      'http://geojson.org/geojson-ld/geojson-context.jsonld',
      'http://iiif.io/api/presentation/3/context.json'
    ],
    motivation: 'georeference',
    target,
    body
  }
}

export function generate (maps) {
  if (!maps || maps.length === 0) {
    return {
      type: 'Annotation',
      '@context': [
        'http://geojson.org/geojson-ld/geojson-context.jsonld',
        'http://iiif.io/api/presentation/3/context.json'
      ],
      motivation: 'georeference',
      target: null,
      body: null
    }
  }

  const annotations = maps
    .map((map) => createMapAnnotation(map))

  if (annotations.length === 1) {
    return annotations[0]
  } else if (annotations.length > 1) {
    return {
      // '@id': `https://data.allmaps.org/annotations/m/${manifest.id}`,
      type: 'AnnotationPage',
      '@context': [
        'http://geojson.org/geojson-ld/geojson-context.jsonld',
        'http://iiif.io/api/presentation/3/context.json'
      ],
      items: annotations
    }
  }
}
