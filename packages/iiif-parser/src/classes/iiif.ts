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

/**
 * Base class that contains a static parse function for IIIF resources
 */
export class IIIF {
  /**
   * Parses as IIIF resource and returns a class containing the parsed version
   * @param iiifResource - Source data of a IIIF resource
   * @param majorVersion - IIIF API version of resource. If not provided, it will be determined automatically
   * @returns Parsed IIIF resource
   */
  static parse(
    iiifResource: unknown,
    majorVersion: MajorVersion | null = null
  ) {
    if (iiifResource && typeof iiifResource === 'object') {
      if (
        majorVersion === 1 ||
        ('@context' in iiifResource &&
          iiifResource['@context'] === Image1ContextString)
      ) {
        const parsedImage = Image1Schema.parse(iiifResource)
        return new Image(parsedImage)
      } else if (majorVersion === 2 || '@id' in iiifResource) {
        if (
          'protocol' in iiifResource &&
          iiifResource.protocol === 'http://iiif.io/api/image'
        ) {
          const parsedImage = Image2Schema.parse(iiifResource)
          return new Image(parsedImage)
        } else if (
          '@type' in iiifResource &&
          iiifResource['@type'] === 'sc:Manifest'
        ) {
          const parsedManifest = Manifest2Schema.parse(iiifResource)
          return new Manifest(parsedManifest)
        } else if (
          '@type' in iiifResource &&
          iiifResource['@type'] === 'sc:Collection'
        ) {
          const parsedCollection = Collection2Schema.parse(iiifResource)
          return new Collection(parsedCollection)
        }
      } else if (majorVersion === 3 || 'id' in iiifResource) {
        if (
          'protocol' in iiifResource &&
          iiifResource.protocol === 'http://iiif.io/api/image'
        ) {
          const parsedImage = Image3Schema.parse(iiifResource)
          return new Image(parsedImage)
        } else if ('type' in iiifResource && iiifResource.type === 'Manifest') {
          const parsedManifest = Manifest3Schema.parse(iiifResource)
          return new Manifest(parsedManifest)
        } else if (
          'type' in iiifResource &&
          iiifResource.type === 'Collection'
        ) {
          const parsedCollection = Collection3Schema.parse(iiifResource)
          return new Collection(parsedCollection)
        }
      }
    }
    // TODO: improve error message
    throw new Error('Invalid IIIF data or unsupported IIIF type')
  }
}
