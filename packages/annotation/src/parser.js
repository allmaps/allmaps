function getSource (annotation) {
  return annotation.target.source || annotation.target
}

// function getImageBasename (annotation) {
//   const source = getSource(annotation)
//   const imageId = source.split('/').slice(-1)[0]

//   if (!imageId) {
//     throw new Error(`Couldn't find image id for image: ${source}`)
//   }

//   return imageId
// }

function getGcps (annotation) {
  return annotation.body.features
    .map((gcpFeature) => ({
      id: gcpFeature.id,
      image: gcpFeature.properties.image || null,
      world: gcpFeature.geometry ? gcpFeature.geometry.coordinates : null
    }))
}

function getImageDimensions (annotation) {
  const selector = annotation.target.selector
  if (selector) {
    const svg = selector.value

    const { groups: { width } } = /width="(?<width>\d+)"/.exec(svg)
    const { groups: { height } } = /height="(?<height>\d+)"/.exec(svg)

    return [parseInt(width), parseInt(height)]
  }
}

function getImageUri (annotation) {
  // TODO: error if undefined
  return annotation.target && annotation.target.service
    && annotation.target.service[0] && annotation.target.service[0]['@id']
}

function getPixelMask (annotation) {
  const selector = annotation.target.selector
  if (selector) {
    const svg = selector.value
    const { groups: { points } } = /points="(?<points>.+)"/.exec(svg)
    return points.split(' ').map((point) => point.split(',').map((c) => parseInt(c)))
  }
}

function getMap (annotation) {
  return {
    id: annotation['@id'],
    source: getSource(annotation),
    image: {
      uri: getImageUri(annotation),
      dimensions: getImageDimensions(annotation),
    },
    pixelMask: getPixelMask(annotation),
    gcps: getGcps(annotation)
  }
}

export function parse (annotation) {
  if (annotation.type === 'Annotation') {
    return [getMap(annotation)]
  } else if (annotation.type === 'AnnotationPage') {
    return annotation.items.map(getMap)
  } else {
    throw new Error('Invalid annotation')
  }
}
