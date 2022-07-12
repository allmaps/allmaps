import { z } from 'zod'

import { ImageSchema } from '../schemas/iiif.js'
import { ImageServiceSchema } from '../schemas/image-service.js'
import { Image2ProfileDescriptionSchema } from '../schemas/image.2.js'
import { ProfileProperties } from '../lib/types.js'

const anyRegionAndSizeFeatures = ['regionByPx', 'sizeByWh']

type Image2ProfileDescriptionType = z.infer<
  typeof Image2ProfileDescriptionSchema
>
type ImageType = z.infer<typeof ImageSchema>
type ImageServiceType = z.infer<typeof ImageServiceSchema>

function parseProfileUri(uri: string): number {
  if (uri.startsWith('http://iiif.io/api/image/2/level0')) {
    return 0
  } else if (uri.startsWith('http://iiif.io/api/image/2/level1')) {
    return 1
  } else if (uri.startsWith('http://iiif.io/api/image/2/level2')) {
    return 2
  } else {
    throw new Error('Unsupported IIIF Image Profile')
  }
}

function parseImage2ProfileDescription(
  parsedProfileDescription: Image2ProfileDescriptionType
): ProfileProperties {
  return {
    maxWidth: parsedProfileDescription.maxWidth,
    maxHeight: parsedProfileDescription.maxHeight,
    maxArea: parsedProfileDescription.maxArea,
    supportsAnyRegionAndSize: anyRegionAndSizeFeatures.every(
      (feature) =>
        parsedProfileDescription.supports &&
        parsedProfileDescription.supports.includes(feature)
    )
  }
}

export function getProfileProperties(
  parsedImage: ImageType | ImageServiceType
): ProfileProperties {
  if ('id' in parsedImage) {
    let supportsAnyRegionAndSize = false
    if (parsedImage.profile === 'level0') {
      if ('extraFeatures' in parsedImage) {
        supportsAnyRegionAndSize = anyRegionAndSizeFeatures.every(
          (feature) =>
            parsedImage.extraFeatures &&
            parsedImage.extraFeatures.includes(feature)
        )
      }
    } else {
      supportsAnyRegionAndSize = true
    }

    return {
      maxWidth: 'maxWidth' in parsedImage ? parsedImage.maxWidth : undefined,
      maxHeight: 'maxHeight' in parsedImage ? parsedImage.maxHeight : undefined,
      maxArea: 'maxArea' in parsedImage ? parsedImage.maxArea : undefined,
      supportsAnyRegionAndSize
    }
  } else if ('@id' in parsedImage) {
    if (Array.isArray(parsedImage.profile)) {
      let supportsAnyRegionAndSize = false
      let maxHeight = Number.NEGATIVE_INFINITY
      let maxWidth = Number.NEGATIVE_INFINITY
      let maxArea = Number.NEGATIVE_INFINITY

      parsedImage.profile.forEach((profile) => {
        if (typeof profile === 'string') {
          const profileLevel = parseProfileUri(profile)
          supportsAnyRegionAndSize =
            supportsAnyRegionAndSize || profileLevel >= 1
        } else {
          const {
            maxWidth: profileMaxWidth,
            maxHeight: profileMaxHeight,
            maxArea: profileMaxArea,
            supportsAnyRegionAndSize: profileSupportsAnyRegionAndSize
          } = parseImage2ProfileDescription(profile)

          if (profileMaxWidth !== undefined) {
            maxWidth = Math.max(profileMaxWidth, maxWidth)
          }

          if (profileMaxHeight !== undefined) {
            maxHeight = Math.max(profileMaxHeight, maxHeight)
          }

          if (profileMaxArea !== undefined) {
            maxArea = Math.max(profileMaxArea, maxArea)
          }

          supportsAnyRegionAndSize =
            supportsAnyRegionAndSize || profileSupportsAnyRegionAndSize
        }
      })

      return {
        maxWidth: maxWidth >= 0 ? maxWidth : undefined,
        maxHeight: maxHeight >= 0 ? maxHeight : undefined,
        maxArea: maxArea >= 0 ? maxArea : undefined,
        supportsAnyRegionAndSize
      }
    } else {
      const profileLevel = parseProfileUri(parsedImage.profile)
      return {
        supportsAnyRegionAndSize: profileLevel >= 1
      }
    }
  } else {
    throw new Error('Invalid Image')
  }
}
