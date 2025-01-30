import { z } from 'zod'

import { CanvasSchema, ImageSchema } from '../schemas/iiif.js'
import { AnnotationBody3Schema } from '../schemas/presentation.3.js'
import { ImageResource2Schema } from '../schemas/presentation.2.js'
import { EmbeddedImage, Image } from './image.js'

import type { LanguageString, Metadata } from '../lib/types.js'
import {
  parseVersion2String,
  parseVersion3String,
  parseVersion2Metadata,
  filterInvalidMetadata
} from '../lib/strings.js'

type CanvasType = z.infer<typeof CanvasSchema>
type ImageType = z.infer<typeof ImageSchema>
type EmbeddedImageType =
  | z.infer<typeof AnnotationBody3Schema>
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
  metadata?: Metadata

  constructor(parsedCanvas: CanvasType) {
    this.width = parsedCanvas.width
    this.height = parsedCanvas.height

    if ('@id' in parsedCanvas) {
      // IIIF Presentation API 2.0

      this.uri = parsedCanvas['@id']

      if (parsedCanvas.label) {
        this.label = parseVersion2String(parsedCanvas.label)
      }

      this.metadata = filterInvalidMetadata(
        parseVersion2Metadata(parsedCanvas.metadata)
      )

      this.image = new EmbeddedImage(
        parsedCanvas.images[0].resource,
        parsedCanvas
      )
    } else if ('id' in parsedCanvas) {
      // IIIF Presentation API 3.0

      this.uri = parsedCanvas.id

      this.label = parseVersion3String(parsedCanvas.label)
      this.metadata = filterInvalidMetadata(parsedCanvas.metadata)

      const annotationBodyOrBodies = parsedCanvas.items[0].items[0].body

      let annotationBody: ImageType | EmbeddedImageType
      if (Array.isArray(annotationBodyOrBodies)) {
        annotationBody = annotationBodyOrBodies[0]
      } else if (annotationBodyOrBodies.type === 'Image') {
        annotationBody = annotationBodyOrBodies
      } else if (annotationBodyOrBodies.type === 'Choice') {
        annotationBody = annotationBodyOrBodies.items[0]
      } else {
        throw new Error('Invalid IIIF Canvas')
      }

      this.image = new EmbeddedImage(annotationBody, parsedCanvas)
    } else {
      throw new Error('Invalid IIIF Canvas')
    }
  }
}
