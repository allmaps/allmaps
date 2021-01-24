function svgSelector (width, height, mask) {
  return {
    type: 'SvgSelector',
    value: `<svg width="${width}" height="${height}"><polygon points="${mask.map((point) => point.join(',')).join(' ')}" /></svg>`
  }
}

function createMapAnnotation (map, image) {
  let source = image.uri
  if (source.endsWith('info.json')) {
    source = source.replace(/\/?info\.json$/gi, '')
  }

  // https://www.w3.org/TR/annotation-model/#sets-of-bodies-and-targets
  let body
  if (map.gcps) {
    body = {
      type: 'FeatureCollection',
      features: map.gcps.map((gcp) => ({
        type: 'Feature',
        properties: {
          pixel: gcp.pixel
        },
        geometry: {
          type: 'Point',
          coordinates: gcp.world
        }
      }))
    }
  }

  let target = {
    source
  }

  if (map.pixelMask) {
    target = {
      source,
      selector: svgSelector(image.width, image.height, map.pixelMask)
    }
  }

  return {
    type: 'Annotation',
    '@id': `https://data.allmaps.org/annotations/i/${image.id}/m/${map.id}`,
    '@context': [
      'http://geojson.org/geojson-ld/geojson-context.jsonld',
      'http://iiif.io/api/presentation/3/context.json'
    ],
    motivation: 'georeference',
    target,
    body
  }
}

export function createAnnotation (manifest, images, maps) {
  if (!maps || Object.keys(maps).length === 0) {
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

  const annotations = Object.values(maps)
    .map((map) => createMapAnnotation(map, images[map.imageId]))

  if (annotations.length === 1) {
    return annotations[0]
  } else if (annotations.length > 1) {
    return {
      '@id': `https://data.allmaps.org/annotations/m/${manifest.id}`,
      type: 'AnnotationPage',
      '@context': [
        'http://geojson.org/geojson-ld/geojson-context.jsonld',
        'http://iiif.io/api/presentation/3/context.json'
      ],
      items: annotations
    }
  }
}
