import { z } from 'zod'

import {
  Collection2Schema,
  Collection3Schema,
  CollectionSchema
} from '../schemas/iiif.js'

import { EmbeddedManifest, Manifest } from './manifest.js'
import type { Image } from './image.js'

import type {
  LanguageString,
  MajorVersion,
  FetchFunction,
  FetchNextOptions,
  FetchNextResults
} from '../lib/types.js'
import { parseVersion2String } from '../lib/strings.js'

type CollectionType = z.infer<typeof CollectionSchema>

const CollectionTypeString = 'collection'

const defaulfFetchNextOptions = {
  maxDepth: Number.POSITIVE_INFINITY,
  fetchManifests: true,
  fetchImages: true
}

export class Collection {
  uri: string
  type: typeof CollectionTypeString = CollectionTypeString
  majorVersion: MajorVersion

  items: (Collection | Manifest | EmbeddedManifest)[] = []

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

  async fetchAll(
    fetch: FetchFunction,
    options: FetchNextOptions = defaulfFetchNextOptions
  ): Promise<FetchNextResults<Collection | Manifest | Image>[]> {
    const results: FetchNextResults<Collection | Manifest | Image>[] = []

    for await (const next of this.fetchNext(fetch, options)) {
      results.push(next)
    }

    return results
  }

  async *fetchNext(
    fetch: FetchFunction,
    options: FetchNextOptions = defaulfFetchNextOptions,
    depth: number = 0
  ): AsyncGenerator<
    FetchNextResults<Collection | Manifest | Image>,
    void,
    void
  > {
    if (options.maxDepth === undefined) {
      options.maxDepth = defaulfFetchNextOptions.maxDepth
    }

    if (options.fetchImages === undefined) {
      options.fetchImages = defaulfFetchNextOptions.fetchImages
    }

    if (options.fetchManifests === undefined) {
      options.fetchManifests = defaulfFetchNextOptions.fetchManifests
    }

    if (depth >= options.maxDepth) {
      return
    }

    for (const itemIndex in this.items) {
      let item = this.items[itemIndex]

      if (item instanceof Manifest) {
        if (options.fetchImages) {
          yield* item.fetchNext(fetch, depth + 1)
        }
      } else if (item instanceof EmbeddedManifest && options.fetchManifests) {
        const manifestUri = item.uri
        const iiifData = await fetch(manifestUri)
        const newManifest = Manifest.parse(iiifData)

        this.items[itemIndex] = newManifest

        yield {
          item: newManifest,
          depth: depth + 1,
          parent: {
            uri: this.uri,
            type: this.type
          }
        }

        if (depth + 1 < options.maxDepth && options.fetchImages) {
          yield* newManifest.fetchNext(fetch, depth + 2)
        }
      } else if (item instanceof Collection) {
        // item is Collection
        // TODO: use embedded
        if (!item.items.length) {
          const collectionUri = item.uri
          const iiifData = await fetch(collectionUri)
          const newCollection = Collection.parse(iiifData)

          this.items[itemIndex] = newCollection

          yield {
            item: newCollection,
            depth: depth + 1,
            parent: {
              uri: this.uri,
              type: this.type
            }
          }

          item = newCollection
        }

        if (depth + 1 < options.maxDepth) {
          yield* item.fetchNext(fetch, options, depth + 2)
        }
      }
    }
  }
}
