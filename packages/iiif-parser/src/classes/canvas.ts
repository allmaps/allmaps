import { z } from 'zod'

import { EmbeddedImage, Image } from './image.js'
import { CanvasSchema } from '../schemas/iiif.js'

import type { LanguageString, Metadata } from '../lib/types.js'
import { parseVersion2String, parseVersion2Metadata, filterInvalidMetadata } from '../lib/strings.js'

type CanvasType = z.infer<typeof CanvasSchema>

const CanvasTypeString = 'canvas'

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

      this.metadata = filterInvalidMetadata(parseVersion2Metadata(parsedCanvas.metadata))

      this.image = new EmbeddedImage(parsedCanvas.images[0].resource, parsedCanvas)
    } else if ('id' in parsedCanvas) {
      // IIIF Presentation API 3.0

      this.uri = parsedCanvas.id

      this.label = parsedCanvas.label
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
