import { z } from 'zod'

import { ImageSchema } from '../schemas/iiif.js'
import { ImageServiceSchema } from '../schemas/image-service.js'
import { Image2ProfileDescriptionSchema } from '../schemas/image.2.js'
import { ProfileProperties, MajorVersion } from '../lib/types.js'

import {
  image1ProfileUriRegex,
  Image1ContextString,
  Image1ContextStringIncorrect
} from '../schemas/image.1.js'
import {
  image2ProfileUriRegex,
  Image2ContextString
} from '../schemas/image.2.js'

const anyRegionAndSizeFeatures = ['regionByPx', 'sizeByWh']

type Image2ProfileDescriptionType = z.infer<
  typeof Image2ProfileDescriptionSchema
>
type ImageType = z.infer<typeof ImageSchema>
type ImageServiceType = z.infer<typeof ImageServiceSchema>

function parseImage1ProfileUri(uri: string): number | undefined {
  const match = uri.match(image1ProfileUriRegex)

  if (match && match.groups) {
    const level = parseInt(match.groups.level)
    return level
  }
}

function parseImage2ProfileUri(uri: string): number | undefined {
  const match = uri.match(image2ProfileUriRegex)

  if (match && match.groups) {
    const level = parseInt(match.groups.level)
    return level
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

export function getMajorIiifVersionFromImageService(
  imageService: ImageServiceType
): MajorVersion {
  if ('type' in imageService && imageService.type === 'ImageService3') {
    return 3
  } else if (
    ('type' in imageService && imageService.type === 'ImageService2') ||
    ('@type' in imageService && imageService['@type'] === 'ImageService2') ||
    ('@context' in imageService &&
      imageService['@context'] === Image2ContextString)
  ) {
    return 2
  } else if (
    '@context' in imageService &&
    (imageService['@context'] === Image1ContextString ||
      imageService['@context'] === Image1ContextStringIncorrect)
  ) {
    return 1
  } else if ('profile' in imageService) {
    let profile: string
    if (Array.isArray(imageService.profile)) {
      profile = imageService.profile[0]
    } else {
      profile = imageService.profile
    }

    if (profile.match(image1ProfileUriRegex)) {
      return 1
    } else if (profile.match(image2ProfileUriRegex)) {
      return 2
    } else {
      return 3
    }
  } else {
    throw new Error('Unsupported IIIF Image Service')
  }
}

export function getProfileProperties(
  parsedImage: ImageType | ImageServiceType
): ProfileProperties {
  // TODO: this function is very messy and needs cleaning up.
  // Probably also needs a better way to keep ImageService and ImageInfo apart.

  if ('type' in parsedImage || '@type' in parsedImage) {
    const profile = parsedImage.profile

    let supportsAnyRegionAndSize = false
    if (
      profile === 'level0' ||
      (typeof profile === 'string' && profile.endsWith('level0.json'))
    ) {
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
  } else if (Array.isArray(parsedImage.profile)) {
    let supportsAnyRegionAndSize = false
    let maxHeight = Number.NEGATIVE_INFINITY
    let maxWidth = Number.NEGATIVE_INFINITY
    let maxArea = Number.NEGATIVE_INFINITY

    parsedImage.profile.forEach((profile) => {
      if (typeof profile === 'string') {
        const profileLevel = parseImage2ProfileUri(profile)
        if (profileLevel) {
          supportsAnyRegionAndSize =
            supportsAnyRegionAndSize || profileLevel >= 1
        }
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
  } else if ('profile' in parsedImage && parsedImage.profile) {
    const profileLevel1 = parseImage1ProfileUri(parsedImage.profile)
    const profileLevel2 = parseImage2ProfileUri(parsedImage.profile)

    if (profileLevel1) {
      return {
        supportsAnyRegionAndSize: profileLevel1 >= 1
      }
    } else if (profileLevel2) {
      return {
        supportsAnyRegionAndSize: profileLevel2 >= 1
      }
    } else {
      return {
        supportsAnyRegionAndSize: false
      }
    }
  } else {
    throw new Error('Invalid Image')
  }
}
