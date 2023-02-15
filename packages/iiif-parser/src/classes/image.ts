import { z } from 'zod'

import { Image2Schema, Image3Schema, ImageSchema } from '../schemas/iiif.js'
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
  TileZoomLevel
} from '../lib/types.js'

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

  supportsAnyRegionAndSize: boolean | null = null

  width: number
  height: number

  majorVersion: MajorVersion

  constructor(parsedImage: ImageType | EmbeddedImageType, embedded = true) {
    if (embedded) {
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
      } else {
        this.majorVersion = 2
      }

      const profileProperties = getProfileProperties(imageService)

      this.supportsAnyRegionAndSize = profileProperties.supportsAnyRegionAndSize

      this.maxWidth = profileProperties.maxWidth
      this.maxHeight = profileProperties.maxHeight
      this.maxArea = profileProperties.maxArea
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
      } else {
        this.majorVersion = 2
      }

      if ('profile' in parsedImage) {
        const profileProperties = getProfileProperties(parsedImage)

        this.supportsAnyRegionAndSize =
          profileProperties.supportsAnyRegionAndSize

        this.maxWidth = profileProperties.maxWidth
        this.maxHeight = profileProperties.maxHeight
        this.maxArea = profileProperties.maxArea
      }
    }

    this.width = parsedImage.width
    this.height = parsedImage.height
  }

  getImageUrl({ region, size }: ImageRequest): string {
    let width
    let height
    let area

    let regionHeight
    let regionWidth

    let urlRegion: string
    if (region) {
      urlRegion = `${region.x},${region.y},${region.width},${region.height}`

      regionHeight = region.width
      regionWidth = region.height
    } else {
      urlRegion = 'full'

      regionHeight= this.height
      regionWidth = this.width
    }

    let urlSize: string
    if (size) {
      width = Math.round(size.width)
      height = Math.round(size.height)

      let widthStr = String(width)
      let heightStr = ''

      const aspectRatioHeight = Math.round((regionHeight / regionWidth) * width)

      if (height !== aspectRatioHeight) {
        heightStr = String(height)
      }

      urlSize = `${widthStr},${heightStr}`
    } else {
      width = this.width
      height = this.height

      urlSize = this.majorVersion === 2 ? 'full' : 'max'
    }

    area = width * height

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

    return `${this.uri}/${urlRegion}/${urlSize}/0/default.jpg`
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

  constructor(parsedImage: ImageType) {
    super(parsedImage, false)

    this.embedded = false

    const profileProperties = getProfileProperties(parsedImage)

    this.tileZoomLevels = getTileZoomLevels(
      { width: this.width, height: this.height },
      parsedImage.tiles,
      profileProperties.supportsAnyRegionAndSize
    )
    this.sizes = parsedImage.sizes
  }

  static parse(iiifData: any, majorVersion: MajorVersion | null = null) {
    let parsedImage

    if (majorVersion === 2) {
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
