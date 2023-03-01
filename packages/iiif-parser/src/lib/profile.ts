import { z } from 'zod'

import { ImageSchema } from '../schemas/iiif.js'
import { ImageServiceSchema } from '../schemas/image-service.js'
import { Image2ProfileDescriptionSchema } from '../schemas/image.2.js'
import { ProfileProperties } from '../lib/types.js'

import {
  Image1ContextString,
  image1ProfileUriRegex
} from '../schemas/image.1.js'
import {
  Image2ContextString,
  image2ProfileUriRegex
} from '../schemas/image.2.js'

import type { MajorVersion } from '../lib/types.js'

const anyRegionAndSizeFeatures = ['regionByPx', 'sizeByWh']

type Image2ProfileDescriptionType = z.infer<
  typeof Image2ProfileDescriptionSchema
>
type ImageType = z.infer<typeof ImageSchema>
type ImageServiceType = z.infer<typeof ImageServiceSchema>

function parseImage1ProfileUri(uri: string): number {
  const match = uri.match(image1ProfileUriRegex)

  if (match && match.groups) {
    const level = parseInt(match.groups.level)
    return level
  } else {
    throw new Error('Unsupported IIIF Image Profile for IIIF Image API 1.1')
  }
}

function parseImage2ProfileUri(uri: string): number {
  const match = uri.match(image2ProfileUriRegex)

  if (match && match.groups) {
    const level = parseInt(match.groups.level)
    return level
  } else {
    throw new Error('Unsupported IIIF Image Profile for IIIF Image API 2.1')
  }
}

function parseImage2ProfileDescription(
  parsedProfileDescription: Image2ProfileDescriptionType
): ProfileProperties {
  return {
    maxWidth: parsedProfileDescription?.maxWidth,
    maxHeight: parsedProfileDescription?.maxHeight,
    maxArea: parsedProfileDescription?.maxArea,
    supportsAnyRegionAndSize: anyRegionAndSizeFeatures.every(
      (feature) =>
        parsedProfileDescription?.supports &&
        parsedProfileDescription?.supports?.includes(feature)
    )
  }
}

export function getProfileProperties(
  parsedImage: ImageType | ImageServiceType
): ProfileProperties {
  if ('type' in parsedImage && parsedImage.type === 'ImageService3') {
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
  } else if (
    '@context' in parsedImage &&
    parsedImage['@context'] === Image2ContextString
  ) {
    if (Array.isArray(parsedImage.profile)) {
      let supportsAnyRegionAndSize = false
      let maxHeight = Number.NEGATIVE_INFINITY
      let maxWidth = Number.NEGATIVE_INFINITY
      let maxArea = Number.NEGATIVE_INFINITY

      parsedImage.profile.forEach((profile) => {
        if (typeof profile === 'string') {
          const profileLevel = parseImage2ProfileUri(profile)
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
      if ('profile' in parsedImage && parsedImage.profile) {
        const profileLevel = parseImage2ProfileUri(parsedImage.profile)

        return {
          supportsAnyRegionAndSize: profileLevel >= 1
        }
      }

      return {
        supportsAnyRegionAndSize: false
      }
    }
  } else if (
    '@context' in parsedImage &&
    parsedImage['@context'] === Image1ContextString
  ) {
    if ('profile' in parsedImage && typeof parsedImage.profile === 'string') {
      const profileLevel = parseImage1ProfileUri(parsedImage.profile)

      return {
        supportsAnyRegionAndSize: profileLevel >= 1
      }
    }

    return {
      supportsAnyRegionAndSize: false
    }
  } else {
    throw new Error('Invalid Image')
  }
}
