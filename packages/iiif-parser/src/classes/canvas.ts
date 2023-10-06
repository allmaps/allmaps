import { z } from 'zod'

import { EmbeddedImage, Image } from './image.js'
import { CanvasSchema } from '../schemas/iiif.js'

import type { LanguageString, Metadata } from '../lib/types.js'
import {
  parseVersion2String,
  parseVersion3String,
  parseVersion2Metadata,
  filterInvalidMetadata
} from '../lib/strings.js'

type CanvasType = z.infer<typeof CanvasSchema>

const CanvasTypeString = 'canvas'

/**
 * Parsed IIIF Canvas
 * @class Canvas
 * @property {string} [uri] - URI of Canvas
 * @property {LanguageString} [label] - Label of Manifest
 * @property {Metadata} [metadata] - Metadata of Manifest
 * @property {EmbeddedImage | Image} [image] - Image of painted on Canvas
 * @property {number} [height] - Height of Canvas
 * @property {number} [width] - Width of Canvas
 * @property {string} [type] - Resource type, equals 'canvas'
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

      let annotationBody
      if (Array.isArray(annotationBodyOrBodies)) {
        annotationBody = annotationBodyOrBodies[0]
      } else {
        annotationBody = annotationBodyOrBodies
      }

      this.image = new EmbeddedImage(annotationBody, parsedCanvas)
    } else {
      throw new Error('Invalid IIIF Canvas')
    }
  }
}
