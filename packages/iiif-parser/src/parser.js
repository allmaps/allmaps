function parseContext (data) {
  const iiif2AndUpBaseUri = 'http://iiif.io/api'

  let iiifContextUri

  if (data['@context'].constructor === Array) {
    // While IIIF APIs 2.0 and up expect IIIF contect to be the last
    //   See https://iiif.io/api/image/3.0/#52-technical-properties
    const lastContext = data['@context'][data['@context'].length - 1]

    if (lastContext.startsWith(iiif2AndUpBaseUri)) {
      iiifContextUri = lastContext
    } else {
      throw new Error('IIIF context not found in right position in @context array, or unsupported IIIF API version.')
    }
  } else {
    iiifContextUri = data['@context']
  }

  const contextRegex = /http:\/\/iiif\.io\/api\/(?<api>\w+)\/(?<version>\d+\.?\d*\.?\d*)\/context\.json/
  const match = iiifContextUri.match(contextRegex)

  if (!match) {
    throw new Error('Incorrect IIIF context, or unsupported IIIF API version.')
  }

  const { groups: { api, version }} = match
  const majorVersion = parseInt(version.split('.')[0])

  return {
    uri: iiifContextUri,
    api,
    version,
    majorVersion
  }
}

export function parseIiif (data, options) {
  options = {
    includeSourceData: true,
    ...options
  }

  const context = parseContext(data)

  if (context.api === 'image') {
    return parseImage(data, {
    context,
    ...options
    })
  } else if (context.api === 'presentation') {
    return parsePresentation(data, {
      context,
      ...options
    })
  } else {
    throw new Error(`Unsupported IIIF API: ${context.api}`)
  }
}

function parsePresentation (data, options) {
  const context = options.context

  if (!(context.majorVersion === 2 || context.majorVersion === 3)) {
    throw new Error(`Only IIIF API versions 2 and 3 are supported.`)
  }

  if (context.majorVersion === 2) {
    const type = data['@type']

    if (type === 'sc:Manifest') {
      return parseManifest(data, options)
    } else if (type === 'sc:Collection') {
      return parseCollection(data, options)
    } else {
      throw new Error(`Unsupported IIIF type: ${type}`)
    }
  } else if (context.majorVersion === 3) {
    const type = data.type

    if (type === 'Manifest') {
      return parseManifest(data, options)
    } else if (type === 'Collection') {
      return parseCollection(data, options)
    } else {
      throw new Error(`Unsupported IIIF type: ${type}`)
    }
  }
}

function parseCollection (collection, options) {
  const context = options.context

  throw new Error('Collections are not yet supported')
}

function parseManifest (manifest, options) {
  const context = options.context

  const uri = manifest['@id'] || manifest.id

  return {
    uri,
    type: 'manifest',
    version: context.majorVersion,
    label: manifest.label,
    images: parseManifestImages(manifest, options),
    sourceData: options.includeSourceData ? manifest : undefined,
  }
}

export function parseProfileUri (profileUri) {
  const match = profileUri.match(/image\/(?<version>\d+)\/level(?<level>\d+)/)

  if (match) {
    const { groups: { version, level }} = match
    return {
      version: parseInt(version),
      level: parseInt(level)
    }
  } else {
    throw new Error(`Invalid Image Profile URI: ${profileUri}`)
  }
}

function parseProfile (context, image) {
  const region = 'full'
  const size = context.version === '2' ? 'full' : 'max'
  const format = 'jpg'
  const quality = 'default'

  let maxWidth
  let maxHeight
  let maxArea

  const anyRegionAndSizeFeatures = [
    'regionByPx',
    'sizeByWh'
  ]

  let supportsAnyRegionAndSize = false

  if (context.majorVersion === 2) {
    if (image.profile) {
      if (typeof image.profile === 'string') {
        const { level: profileLevel } = parseProfileUri(image.profile)
        supportsAnyRegionAndSize ||= (profileLevel >= 1)
      } else if (image.profile.constructor === Array) {
        image.profile.forEach((profile) => {
          if (typeof profile === 'string') {
            const { level: profileLevel } = parseProfileUri(profile)
            supportsAnyRegionAndSize ||= (profileLevel >= 1)
          } else {
            if (profile.maxWidth) {
              maxWidth = maxWidth ? Math.max(profile.maxWidth, maxWidth) : profile.maxWidth
            }

            if (profile.maxHeight) {
              maxHeight = maxHeight ? Math.max(profile.maxHeight, maxHeight) : profile.maxHeight
            }

            if (profile.maxArea) {
              maxArea = maxArea ? Math.max(profile.maxArea, maxArea) : profile.maxArea
            }

            if (profile.supports) {
              supportsAnyRegionAndSize ||= anyRegionAndSizeFeatures
                .every((feature) => profile.supports.includes(feature))
            }
          }
        })
      } else {
        throw new Error('Invalid Image profile')
      }
    }
  } else if (context.majorVersion === 3) {
    if (!image.profile) {
      throw new error('Profile not present in image')
    }

    maxWidth = image.maxWidth
    maxHeight = image.maxHeight
    maxArea = image.maxArea

    if (image.profile === 'level0') {
      if (image.extraFeatures) {
        supportsAnyRegionAndSize = anyRegionAndSizeFeatures
          .every((feature) => image.extraFeatures.includes(feature))
      }
    } else {
      supportsAnyRegionAndSize = true
    }
  }

  return {
    region,
    size,
    format,
    quality,
    maxWidth,
    maxHeight,
    maxArea,
    supportsAnyRegionAndSize
  }
}

function parseImage (image, options) {
  options = {
    includeSourceData: true,
    ...options
  }

  let context = options.context
  let imageVersion

  const type = image['@type'] || image.type

  if (type === 'ImageService2') {
    imageVersion = 2
  } else if (type === 'ImageService3') {
    imageVersion = 3
  } else if (image['@context']) {
    context = parseContext(image)
    imageVersion = context.majorVersion
  } else if (image.profile) {
    const parsedProfileUri = parseProfileUri(image.profile)
    imageVersion = parsedProfileUri.version
  } else {
    throw new Error('Unable to determine Image API version')
  }

  if (!(imageVersion === 2 || imageVersion === 3)) {
    console.log(image)
    throw new Error('Only supports Image API versions 2 and 3')
  }

  const uri = image['@id'] || image.id

  const canvas = options.canvas
  const canvasUri = canvas && (canvas['@id'] || canvas.id)
  const label = image.label || (canvas && canvas.label)

  const width = image.width || (canvas && canvas.width)
  const height = image.height || (canvas && canvas.height)

  if (!width || !height) {
    console.log('geeeen width', canvas)
  }

  const { region, size, format, quality, supportsAnyRegionAndSize,
    maxWidth, maxHeight, maxArea } = parseProfile(context, image)

  return {
    type: 'image',
    version: imageVersion,
    uri,
    canvasUri,
    label,
    width,
    height,
    format,
    quality,
    supportsAnyRegionAndSize,
    maxWidth,
    maxHeight,
    maxArea,
    fullImageUrl: `${uri}/${region}/${size}/0/${quality}.${format}`,
    tiles: image.tiles,
    sizes: image.sizes,
    sourceData: options.includeSourceData ? image : undefined
  }
}

function parseManifestImages (manifest, options) {
  const context = options.context

  let canvases
  if (context.majorVersion === 2) {
    if (manifest.sequences.length !== 1) {
      throw new Error('Only accepts manifest with single sequence')
    }

    const sequence = manifest.sequences[0]
    canvases = sequence.canvases
  } else if (context.majorVersion === 3) {
    canvases = manifest.items
  } else {
    throw new Error(`Unsupported Presentation API version: ${version}`)
  }

  return canvases.map((canvas) => {
    let images

    if (context.majorVersion === 2) {
      images = canvas.images
    } else if (context.majorVersion === 3) {
      images = canvas.items
    }

    if (images.length !== 1) {
      throw new Error('Only accepts canvases with single image')
    }

    const imageAnnotations = images[0]

    let imageAnnotation
    if (imageAnnotations.type === 'AnnotationPage' ||
      imageAnnotations['@type'] === 'oa:AnnotationPage') {
      if (imageAnnotations.items.length !== 1) {
        throw new Error('Only accepts images with single image annotation')
      }

      imageAnnotation = imageAnnotations.items[0]
    } else if (imageAnnotations.type === 'Annotation' ||
    imageAnnotations['@type'] === 'oa:Annotation') {
      imageAnnotation = imageAnnotations
    } else {
      throw new Error(`Invalid type`)
    }

    const resource = imageAnnotation.body || imageAnnotation.resource

    let iiifApiImage
    if (resource.service.constructor === Array) {
      iiifApiImage = resource.service[0]
    } else {
      iiifApiImage = resource.service
    }

    return parseImage(iiifApiImage, {
      canvas,
      ...options
    })
  })
}
