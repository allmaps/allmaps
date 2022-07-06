import { z } from 'zod'

import { EmbeddedImage } from './image.js'
import { CanvasSchema } from '../schemas/iiif.js'

import type { LanguageString, Metadata } from '../lib/types.js'
import { parseVersion2String, parseVersion2Metadata } from '../lib/strings.js'

type CanvasType = z.infer<typeof CanvasSchema>

export class Canvas {
  uri: string
  type = 'canvas'

  height: number
  width: number

  image: EmbeddedImage

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

      this.metadata = parseVersion2Metadata(parsedCanvas.metadata)

      this.image = new EmbeddedImage(parsedCanvas.images[0].resource)
    } else if ('id' in parsedCanvas) {
      // IIIF Presentation API 3.0

      this.uri = parsedCanvas.id

      this.label = parsedCanvas.label
      this.metadata = parsedCanvas.metadata

      this.image = new EmbeddedImage(parsedCanvas.items[0].items[0].body)
    } else {
      throw new Error('Invalid IIIF Canvas')
    }
  }
}
