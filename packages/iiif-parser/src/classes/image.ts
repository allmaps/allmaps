import { z } from 'zod'

import { CanvasSchema } from '../schemas/iiif.js'
import { ImageSchema } from '../schemas/iiif.js'

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
type CanvasType = z.infer<typeof CanvasSchema>
type EmbeddedImageType = ImageType | CanvasType

export class EmbeddedImage {
  embedded = true
  uri: string
  type = 'image'

  width: number
  height: number

  majorVersion: MajorVersion

  constructor(parsedImageOrCanvas: EmbeddedImageType) {
    if (
      'protocol' in parsedImageOrCanvas &&
      parsedImageOrCanvas.protocol === 'http://iiif.io/api/image'
    ) {
      // parsedImageOrCanvas is an Image
      if ('@id' in parsedImageOrCanvas) {
        this.uri = parsedImageOrCanvas['@id']
        this.majorVersion = 2
      } else if ('id' in parsedImageOrCanvas) {
        this.uri = parsedImageOrCanvas.id
        this.majorVersion = 3
      } else {
        throw new Error('Unsupported IIIF Image')
      }

      this.width = parsedImageOrCanvas.width
      this.height = parsedImageOrCanvas.height
    } else if (
      '@type' in parsedImageOrCanvas &&
      parsedImageOrCanvas['@type'] === 'sc:Canvas'
    ) {
      // parsedImageOrCanvas is a IIIF Presentation API 2.1 Canvas

      const imageResource = parsedImageOrCanvas.images[0].resource
      const imageService = imageResource.service

      this.width = imageResource.width
      this.height = imageResource.height

      if ('@id' in imageService) {
        this.uri = imageService['@id']
        this.majorVersion = 2
      } else if ('id' in imageService) {
        this.uri = imageService.id
        this.majorVersion = 3
      } else {
        throw new Error('Unsupported IIIF Image Service')
      }
    } else if (
      'type' in parsedImageOrCanvas &&
      parsedImageOrCanvas.type === 'Canvas'
    ) {
      // parsedImageOrCanvas is a IIIF Presentation API 3.0 Canvas

      const annotationBody = parsedImageOrCanvas.items[0].items[0].body

      this.width = annotationBody.width
      this.height = annotationBody.height

      const imageService = annotationBody.service[0]

      if ('@id' in imageService) {
        this.uri = imageService['@id']
        this.majorVersion = 2
      } else if ('id' in imageService) {
        this.uri = imageService.id
        this.majorVersion = 3
      } else {
        throw new Error('Unsupported IIIF Image')
      }
    } else {
      throw new Error('Unsupported IIIF Canvas')
    }
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
  supportsAnyRegionAndSize: boolean
  maxWidth?: number
  maxHeight?: number
  maxArea?: number

  // TODO: add
  //  - canvasUri,
  //  - label,

  tileZoomLevels: TileZoomLevel[]
  sizes?: Size[]

  constructor(parsedImage: ImageType) {
    super(parsedImage)

    this.embedded = false

    const profileProperties = getProfileProperties(parsedImage)
    this.supportsAnyRegionAndSize = profileProperties.supportsAnyRegionAndSize
    this.maxWidth = profileProperties.maxWidth
    this.maxHeight = profileProperties.maxHeight
    this.maxArea = profileProperties.maxArea

    this.tileZoomLevels = getTileZoomLevels(
      { width: this.width, height: this.height },
      parsedImage.tiles,
      this.supportsAnyRegionAndSize
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
