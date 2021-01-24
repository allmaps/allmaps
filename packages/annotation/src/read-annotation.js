function getSource (annotation) {
  return annotation.target.source || annotation.target
}

function getImageBasename (annotation) {
  const source = getSource(annotation)
  const imageId = source.split('/').slice(-1)[0]

  if (!imageId) {
    throw new Error(`Couldn't find image id for image: ${source}`)
  }

  return imageId
}

function getGcps (annotation) {
  if (Array.isArray(annotation.body)) {
    return annotation.body
      .filter((body) => body.type === 'FeatureCollection')[0]
  } else {
    return annotation.body
  }
}

function getPixelMask (annotation) {
  const selector = annotation.target.selector
  if (selector) {
    const svg = selector.value
    const { groups: { points } } = /points="(?<points>.+)"/.exec(svg)
    return points.split(' ').map((point) => point.split(',').map((c) => parseInt(c)))
  }
}

module.exports = {
  getSource,
  getImageBasename,
  getGcps,
  getPixelMask
}
