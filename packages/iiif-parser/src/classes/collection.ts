import { z } from 'zod'

import {
  Collection2Schema,
  Collection3Schema,
  CollectionSchema
} from '../schemas/iiif.js'

import { EmbeddedManifest, Manifest } from './manifest.js'

import type { LanguageString, Metadata, MajorVersion } from '../lib/types.js'
import { parseVersion2String, parseVersion2Metadata } from '../lib/strings.js'

type CollectionType = z.infer<typeof CollectionSchema>

export class Collection {
  uri: string
  type = 'collection'
  majorVersion: MajorVersion

  items: (Collection | EmbeddedManifest)[] = []

  // TODO: add description? Add metadata?
  label?: LanguageString

  constructor(parsedCollection: CollectionType) {
    if ('@type' in parsedCollection) {
      // IIIF Presentation API 2.0
      this.uri = parsedCollection['@id']
      this.majorVersion = 2

      if (parsedCollection.label) {
        this.label = parseVersion2String(parsedCollection.label)
      }

      this.items = [
        ...(parsedCollection.manifests || []),
        ...(parsedCollection.collections || []),
        ...(parsedCollection.members || [])
      ].map((item) => {
        if (item['@type'] === 'sc:Collection') {
          return new Collection(item)
        } else {
          return new EmbeddedManifest(item)
        }
      })
    } else if ('type' in parsedCollection) {
      // IIIF Presentation API 3.0
      this.uri = parsedCollection.id
      this.majorVersion = 3

      this.label = parsedCollection.label

      this.items = parsedCollection.items.map((item) => {
        if (item.type === 'Collection') {
          return new Collection(item)
        } else {
          return new EmbeddedManifest(item)
        }
      })
    } else {
      // TODO: improve error message
      throw new Error('Unsupported Collection')
    }
  }

  static parse(iiifData: any, majorVersion: MajorVersion | null = null) {
    let parsedCollection

    if (majorVersion === 2) {
      parsedCollection = Collection2Schema.parse(iiifData)
    } else if (majorVersion === 3) {
      parsedCollection = Collection3Schema.parse(iiifData)
    } else {
      parsedCollection = CollectionSchema.parse(iiifData)
    }

    return new Collection(parsedCollection)
  }
}
