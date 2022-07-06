import { z } from 'zod'

import { ImageSchema } from '../schemas/iiif.js'
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

export class EmbeddedImage {
  embedded = true
  uri: string
  type = 'image'

  // maxWidth: number | null
  // maxHeight: number | null
  // maxArea: number | null = null

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
        this.majorVersion = 2
      } else if ('id' in imageService) {
        this.uri = imageService.id
        this.majorVersion = 3
      } else {
        throw new Error('Unsupported IIIF Image Service')
      }

      const profileProperties = getProfileProperties(imageService)

      this.supportsAnyRegionAndSize = profileProperties.supportsAnyRegionAndSize
      // this.maxWidth = profileProperties.maxWidth
      // this.maxHeight = profileProperties.maxHeight
      // this.maxArea = profileProperties.maxArea
    } else {
      if ('@id' in parsedImage) {
        this.uri = parsedImage['@id']
        this.majorVersion = 2
      } else if ('id' in parsedImage) {
        this.uri = parsedImage.id
        this.majorVersion = 3
      } else {
        throw new Error('Unsupported IIIF Image')
      }
      console.log('VISEN', parsedImage)

      if ('profile' in parsedImage) {
        const profileProperties = getProfileProperties(parsedImage)

        this.supportsAnyRegionAndSize =
          profileProperties.supportsAnyRegionAndSize
        // this.maxWidth = profileProperties.maxWidth
        // this.maxHeight = profileProperties.maxHeight
        // this.maxArea = profileProperties.maxArea


        console.log('BEEEER', profileProperties.supportsAnyRegionAndSize)
      }
    }

    this.width = parsedImage.width
    this.height = parsedImage.height
  }

  getImageUrl({ region, size }: ImageRequest): string {
    let urlRegion: string
    if (region) {
      urlRegion = `${region.x},${region.y},${region.width},${region.height}`
    } else {
      urlRegion = 'full'
    }

    let urlSize: string
    if (size) {
      let height = ''
      if (size.height && size.width !== size.height) {
        height = String(size.height)
      }

      urlSize = `${size.width},${height}`
    } else {
      urlSize = this.majorVersion === 2 ? 'full' : 'max'
    }

    return `${this.uri}/${urlRegion}/${urlSize}/0/default.jpg`
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

  static parse(iiifData: any) {
    const parsedImage = ImageSchema.parse(iiifData)
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
      this.sizes,
      this.tileZoomLevels,
      this.supportsAnyRegionAndSize,
      { width: this.width, height: this.height },
      size,
      mode
    )
  }
}
