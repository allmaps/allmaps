import {
  Image1Schema,
  Image2Schema,
  Image3Schema,
  // TODO: add Canvas!
  Manifest2Schema,
  Manifest3Schema,
  Collection2Schema,
  Collection3Schema
} from '../schemas/iiif.js'

import { Image1ContextString } from '../schemas/image.1.js'

import { Image } from './image.js'
import { Manifest } from './manifest.js'
import { Collection } from './collection.js'

import type { MajorVersion } from '../lib/types.js'

export class IIIF {
  static parse(iiifData: unknown, majorVersion: MajorVersion | null = null) {
    if (iiifData && typeof iiifData === 'object') {
      if (
        majorVersion === 1 ||
        ('@context' in iiifData && iiifData['@context'] === Image1ContextString)
      ) {
        const parsedImage = Image1Schema.parse(iiifData)
        return new Image(parsedImage)
      } else if (majorVersion === 2 || '@id' in iiifData) {
        if (
          'protocol' in iiifData &&
          iiifData.protocol === 'http://iiif.io/api/image'
        ) {
          const parsedImage = Image2Schema.parse(iiifData)
          return new Image(parsedImage)
        } else if ('@type' in iiifData && iiifData['@type'] === 'sc:Manifest') {
          const parsedManifest = Manifest2Schema.parse(iiifData)
          return new Manifest(parsedManifest)
        } else if (
          '@type' in iiifData &&
          iiifData['@type'] === 'sc:Collection'
        ) {
          const parsedCollection = Collection2Schema.parse(iiifData)
          return new Collection(parsedCollection)
        }
      } else if (majorVersion === 3 || 'id' in iiifData) {
        if (
          'protocol' in iiifData &&
          iiifData.protocol === 'http://iiif.io/api/image'
        ) {
          const parsedImage = Image3Schema.parse(iiifData)
          return new Image(parsedImage)
        } else if ('type' in iiifData && iiifData.type === 'Manifest') {
          const parsedManifest = Manifest3Schema.parse(iiifData)
          return new Manifest(parsedManifest)
        } else if ('type' in iiifData && iiifData.type === 'Collection') {
          const parsedCollection = Collection3Schema.parse(iiifData)
          return new Collection(parsedCollection)
        }
      }
    }
    // TODO: improve error message
    throw new Error('Invalid IIIF data or unsupported IIIF type')
  }
}
