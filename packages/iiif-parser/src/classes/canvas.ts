import { z } from 'zod'

import { CanvasSchema } from '../schemas/iiif.js'
import { AnnotationImageBody3Schema } from '../schemas/presentation.3.js'
import { ImageResource2Schema } from '../schemas/presentation.2.js'
import { EmbeddedImage, Image } from './image.js'

import type {
  LanguageString,
  Metadata,
  NavDate,
  NavPlace,
  Thumbnail,
  SeeAlso,
  RequiredStatement,
  Summary,
  Annotations,
  Homepage,
  Rendering,
  ConstructorOptions
} from '../lib/types.js'
import {
  parseVersion2String,
  parseVersion3String,
  parseVersion2Metadata,
  parseVersion3Metadata,
  parseVersion2Attribution,
  parseVersion2Thumbnail,
  parseVersion2Rendering,
  parseVersion2Related
} from '../lib/convert.js'

type CanvasType = z.infer<typeof CanvasSchema>
type EmbeddedImageType =
  | z.infer<typeof AnnotationImageBody3Schema>
  | z.infer<typeof ImageResource2Schema>

const CanvasTypeString = 'canvas'

/**
 * Parsed IIIF Canvas
 *
 * @property uri - URI of Canvas
 * @property label - Label of Manifest
 * @property metadata - Metadata of Manifest
 * @property image - Image of painted on Canvas
 * @property height - Height of Canvas
 * @property width - Width of Canvas
 * @property type - Resource type, equals 'canvas'
 */
export class Canvas {
  uri: string
  type: typeof CanvasTypeString = CanvasTypeString

  height: number
  width: number

  image: EmbeddedImage | Image

  label?: LanguageString
  description?: LanguageString
  metadata?: Metadata
  navDate?: NavDate
  navPlace?: NavPlace
  homepage?: Homepage
  thumbnail?: Thumbnail
  rendering?: Rendering
  seeAlso?: SeeAlso
  summary?: Summary
  requiredStatement?: RequiredStatement

  annotations?: Annotations

  constructor(parsedCanvas: CanvasType) {
    this.width = parsedCanvas.width
    this.height = parsedCanvas.height

    if ('@id' in parsedCanvas) {
      // IIIF Presentation API 2.0

      this.uri = parsedCanvas['@id']

      this.description = parseVersion2String(parsedCanvas.description)
      this.label = parseVersion2String(parsedCanvas.label)
      this.metadata = parseVersion2Metadata(parsedCanvas.metadata)

      this.navDate = parsedCanvas.navDate
      this.navPlace = parsedCanvas.navPlace

      this.requiredStatement = parseVersion2Attribution(
        parsedCanvas.attribution
      )
      this.thumbnail = parseVersion2Thumbnail(parsedCanvas.thumbnail)
      this.rendering = parseVersion2Rendering(parsedCanvas.rendering)
      this.homepage = parseVersion2Related(parsedCanvas.related)

      this.image = new EmbeddedImage(parsedCanvas.images[0].resource, {
        parsedCanvas
      })
    } else if ('id' in parsedCanvas) {
      // IIIF Presentation API 3.0

      this.uri = parsedCanvas.id

      this.label = parseVersion3String(parsedCanvas.label)
      this.description = parseVersion3String(parsedCanvas.description)
      this.metadata = parseVersion3Metadata(parsedCanvas.metadata)

      this.navDate = parsedCanvas.navDate
      this.navPlace = parsedCanvas.navPlace
      this.homepage = parsedCanvas.homepage
      this.thumbnail = parsedCanvas.thumbnail
      this.rendering = parsedCanvas.rendering
      this.seeAlso = parsedCanvas.seeAlso
      this.summary = parsedCanvas.summary
      this.requiredStatement = parsedCanvas.requiredStatement

      this.annotations = parsedCanvas.annotations

      const annotationBodyOrBodies = parsedCanvas.items[0].items[0].body

      let annotationBody: EmbeddedImageType | undefined
      if (Array.isArray(annotationBodyOrBodies)) {
        annotationBody = annotationBodyOrBodies.find(
          (body) => body.type === 'Image'
        )
      } else if (annotationBodyOrBodies.type === 'Image') {
        annotationBody = annotationBodyOrBodies
      } else if (annotationBodyOrBodies.type === 'Choice') {
        annotationBody = annotationBodyOrBodies.items.find(
          (body) => body.type === 'Image'
        )
      }

      if (annotationBody) {
        this.image = new EmbeddedImage(annotationBody, {
          parsedCanvas
        })
      } else {
        throw new Error('No image found on IIIF Canvas')
      }
    } else {
      throw new Error('Invalid IIIF Canvas')
    }
  }
}
