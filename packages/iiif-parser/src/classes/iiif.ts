import {
  Image2Schema,
  Image3Schema,
  Manifest2Schema,
  Manifest3Schema
} from '../schemas/iiif.js'

import { Image } from './image.js'
import { Manifest } from './manifest.js'

import type { MajorVersion } from '../lib/types.js'

export class IIIF {
  static parse(iiifData: any, majorVersion: MajorVersion | null = null) {
    if (majorVersion === 2 || '@id' in iiifData) {
      if (iiifData.protocol === 'http://iiif.io/api/image') {
        const parsedImage = Image2Schema.parse(iiifData)
        return new Image(parsedImage)
      } else if (iiifData['@type'] === 'sc:Manifest') {
        const parsedManifest = Manifest2Schema.parse(iiifData)
        return new Manifest(parsedManifest)
      }
    } else if (majorVersion === 3 || 'id' in iiifData) {
      if (iiifData.protocol === 'http://iiif.io/api/image') {
        const parsedImage = Image3Schema.parse(iiifData)
        return new Image(parsedImage)
      } else if (iiifData.type === 'Manifest') {
        const parsedManifest = Manifest3Schema.parse(iiifData)
        return new Manifest(parsedManifest)
      }
    }

    throw new Error('Invalid IIIF data or unsupported IIIF type')
  }
}
