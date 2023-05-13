import { z } from 'zod'

import {
  CanvasSchema,
  Image1Schema,
  Image2Schema,
  Image3Schema,
  ImageSchema
} from '../schemas/iiif.js'
import {
  Image1ContextString,
  Image1ContextStringIncorrect,
  image1ProfileUriRegex
} from '../schemas/image.1.js'
import {
  Image2ContextString,
  image2ProfileUriRegex
} from '../schemas/image.2.js'
import { ImageResource2Schema } from '../schemas/presentation.2.js'
import { AnnotationBody3Schema } from '../schemas/presentation.3.js'

import { getTileZoomLevels, getIiifTile } from '../lib/tiles.js'
import { getThumbnail } from '../lib/thumbnails.js'
import { getProfileProperties } from '../lib/profile.js'

import type {
  Size,
  Fit,
  ImageRequest,
  MajorVersion,
  Tileset,
  TileZoomLevel
} from '../lib/types.js'

type CanvasType = z.infer<typeof CanvasSchema>
type ImageType = z.infer<typeof ImageSchema>
type EmbeddedImageType =
  | z.infer<typeof AnnotationBody3Schema>
  | z.infer<typeof ImageResource2Schema>

const ImageTypeString = 'image'

export class EmbeddedImage {
  embedded = true

  uri: string
  type: typeof ImageTypeString = ImageTypeString

  maxWidth: number | undefined
  maxHeight: number | undefined
  maxArea: number | undefined

  supportsAnyRegionAndSize: boolean

  width: number
  height: number

  majorVersion: MajorVersion

  constructor(
    parsedImage: ImageType | EmbeddedImageType,
    parsedCanvas?: CanvasType
  ) {
    if (parsedCanvas) {
      const parsedEmbeddedImage = parsedImage as EmbeddedImageType

      let imageService
      if (Array.isArray(parsedEmbeddedImage.service)) {
        imageService = parsedEmbeddedImage.service[0]
      } else {
        imageService = parsedEmbeddedImage.service
      }

      if ('@id' in imageService) {
        this.uri = imageService['@id']
      } else if ('id' in imageService) {
        this.uri = imageService.id
      } else {
        throw new Error('Unsupported IIIF Image Service')
      }

      if ('type' in imageService && imageService.type === 'ImageService3') {
        this.majorVersion = 3
      } else if (
        ('type' in imageService && imageService.type === 'ImageService2') ||
        ('@type' in imageService &&
          imageService['@type'] === 'ImageService2') ||
        ('@context' in imageService &&
          imageService['@context'] === Image2ContextString)
      ) {
        this.majorVersion = 2
      } else if (
        '@context' in imageService &&
        (imageService['@context'] === Image1ContextString ||
          imageService['@context'] === Image1ContextStringIncorrect)
      ) {
        this.majorVersion = 1
      } else if ('profile' in imageService) {
        let profile: string
        if (Array.isArray(imageService.profile)) {
          profile = imageService.profile[0]
        } else {
          profile = imageService.profile
        }

        if (profile.match(image1ProfileUriRegex)) {
          this.majorVersion = 1
        } else if (profile.match(image2ProfileUriRegex)) {
          this.majorVersion = 2
        } else {
          this.majorVersion = 3
        }
      } else {
        throw new Error('Unsupported IIIF Image Service')
      }

      if ('profile' in imageService) {
        const profileProperties = getProfileProperties(imageService)

        this.supportsAnyRegionAndSize =
          profileProperties.supportsAnyRegionAndSize

        this.maxWidth = profileProperties.maxWidth
        this.maxHeight = profileProperties.maxHeight
        this.maxArea = profileProperties.maxArea
      } else {
        this.supportsAnyRegionAndSize = false
      }
    } else {
      if ('@id' in parsedImage) {
        this.uri = parsedImage['@id']
      } else if ('id' in parsedImage) {
        this.uri = parsedImage.id
      } else {
        throw new Error('Unsupported IIIF Image')
      }

      if ('type' in parsedImage && parsedImage.type === 'ImageService3') {
        this.majorVersion = 3
      } else if (
        ('@type' in parsedImage && parsedImage['@type'] === 'iiif:Image') ||
        ('@context' in parsedImage &&
          parsedImage['@context'] === Image2ContextString)
      ) {
        this.majorVersion = 2
      } else if (
        '@context' in parsedImage &&
        parsedImage['@context'] === Image1ContextString
      ) {
        this.majorVersion = 1
      } else {
        throw new Error('Unsupported IIIF Image')
      }

      if ('profile' in parsedImage) {
        const profileProperties = getProfileProperties(parsedImage)

        this.supportsAnyRegionAndSize =
          profileProperties.supportsAnyRegionAndSize

        this.maxWidth = profileProperties.maxWidth
        this.maxHeight = profileProperties.maxHeight
        this.maxArea = profileProperties.maxArea
      } else {
        this.supportsAnyRegionAndSize = false
      }
    }

    if (parsedImage.width !== undefined) {
      this.width = parsedImage.width
    } else if (parsedCanvas) {
      this.width = parsedCanvas.width
    } else {
      throw new Error('Width not present on either Canvas or Image Resource')
    }

    if (parsedImage.height !== undefined) {
      this.height = parsedImage.height
    } else if (parsedCanvas) {
      this.height = parsedCanvas.height
    } else {
      throw new Error('Height not present on either Canvas or Image Resource')
    }
  }

  getImageUrl({ region, size }: ImageRequest): string {
    let width
    let height

    let regionHeight
    let regionWidth

    let urlRegion: string
    if (region) {
      urlRegion = `${region.x},${region.y},${region.width},${region.height}`

      regionHeight = region.height
      regionWidth = region.width
    } else {
      urlRegion = 'full'

      regionHeight = this.height
      regionWidth = this.width
    }

    let urlSize: string
    if (size) {
      width = Math.round(size.width)
      height = Math.round(size.height)

      const widthStr = String(width)
      let heightStr = String(height)

      if (this.majorVersion <= 2) {
        const aspectRatio = regionWidth / regionHeight
        const aspectRatioWidth = height * aspectRatio
        const aspectRatioHeight = aspectRatioWidth / aspectRatio

        // Is this really the right way to do it?
        // See also:
        // - https://www.jack-reed.com/2016/10/14/rounding-strategies-used-in-iiif.html
        if (height === Math.round(aspectRatioHeight)) {
          heightStr = ''
        }
      }

      urlSize = `${widthStr},${heightStr}`
    } else {
      width = this.width
      height = this.height

      urlSize = this.majorVersion === 2 ? 'full' : 'max'
    }

    const area = width * height

    if (this.maxWidth !== undefined) {
      if (width > this.maxWidth) {
        throw new Error(
          `Width of requested image is too large: ${width} > ${this.maxWidth}`
        )
      }
    }

    if (this.maxHeight !== undefined) {
      if (height > this.maxHeight) {
        throw new Error(
          `Height of requested image is too large: ${height} > ${this.maxHeight}`
        )
      }
    }

    if (this.maxArea !== undefined) {
      if (area > this.maxArea) {
        throw new Error(
          `Area of requested image is too large: ${area} > ${this.maxArea}`
        )
      }
    }

    const quality = this.majorVersion === 1 ? 'native' : 'default'

    return `${this.uri}/${urlRegion}/${urlSize}/0/${quality}.jpg`
  }

  getThumbnail(
    size: Size,
    mode: Fit = 'cover'
  ): ImageRequest | ImageRequest[][] {
    return getThumbnail(
      { width: this.width, height: this.height },
      size,
      mode,
      {
        supportsAnyRegionAndSize: this.supportsAnyRegionAndSize,
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight,
        maxArea: this.maxArea
      }
    )
  }
}

export class Image extends EmbeddedImage {
  tileZoomLevels: TileZoomLevel[]
  sizes?: Size[]

  embedded = false

  constructor(parsedImage: ImageType) {
    super(parsedImage)

    const profileProperties = getProfileProperties(parsedImage)

    let tilesets: Tileset[] | undefined
    if ('tiles' in parsedImage) {
      tilesets = parsedImage.tiles
    }

    this.tileZoomLevels = getTileZoomLevels(
      { width: this.width, height: this.height },
      tilesets,
      profileProperties.supportsAnyRegionAndSize
    )

    if ('sizes' in parsedImage) {
      this.sizes = parsedImage.sizes
    }
  }

  static parse(iiifData: unknown, majorVersion: MajorVersion | null = null) {
    let parsedImage

    if (majorVersion === 1) {
      parsedImage = Image1Schema.parse(iiifData)
    } else if (majorVersion === 2) {
      parsedImage = Image2Schema.parse(iiifData)
    } else if (majorVersion === 3) {
      parsedImage = Image3Schema.parse(iiifData)
    } else {
      parsedImage = ImageSchema.parse(iiifData)
    }

    return new Image(parsedImage)
  }

  getIiifTile(
    zoomLevel: TileZoomLevel,
    column: number,
    row: number
  ): ImageRequest {
    return getIiifTile(
      { width: this.width, height: this.height },
      zoomLevel,
      column,
      row
    )
  }

  getThumbnail(
    size: Size,
    mode: Fit = 'cover'
  ): ImageRequest | ImageRequest[][] {
    return getThumbnail(
      { width: this.width, height: this.height },
      size,
      mode,
      {
        supportsAnyRegionAndSize: this.supportsAnyRegionAndSize,
        sizes: this.sizes,
        tileZoomLevels: this.tileZoomLevels,
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight,
        maxArea: this.maxArea
      }
    )
  }
}
