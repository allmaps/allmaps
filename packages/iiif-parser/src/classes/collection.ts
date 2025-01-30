import { z } from 'zod'

import {
  Collection2Schema,
  Collection3Schema,
  CollectionSchema
} from '../schemas/iiif.js'

import { EmbeddedManifest, Manifest } from './manifest.js'
import type { Image, EmbeddedImage } from './image.js'
import type { Canvas } from './canvas.js'

import type {
  LanguageString,
  MajorVersion,
  FetchNextOptions,
  FetchNextResults
} from '../lib/types.js'
import { parseVersion2String, parseVersion3String } from '../lib/strings.js'

type CollectionType = z.infer<typeof CollectionSchema>

const CollectionTypeString = 'collection'

const defaulfFetchNextOptions = {
  maxDepth: Number.POSITIVE_INFINITY,
  fetchCollections: true,
  fetchManifests: true,
  fetchImages: false,
  fetchFn: globalThis.fetch
}

export class EmbeddedCollection {
  uri: string
  type: typeof CollectionTypeString = CollectionTypeString
  majorVersion: MajorVersion

  // TODO: add description?
  // TODO: add metadata?
  label?: LanguageString

  embedded = true

  constructor(parsedCollection: CollectionType) {
    if ('@type' in parsedCollection) {
      // IIIF Presentation API 2.0
      this.uri = parsedCollection['@id']
      this.majorVersion = 2

      if (parsedCollection.label) {
        this.label = parseVersion2String(parsedCollection.label)
      }
    } else if ('type' in parsedCollection) {
      // IIIF Presentation API 3.0
      this.uri = parsedCollection.id
      this.majorVersion = 3

      this.label = parseVersion3String(parsedCollection.label)
    } else {
      // TODO: improve error message
      throw new Error('Unsupported Collection')
    }
  }

  /**
   * Parses a IIIF Collection and returns a [Collection](#collection) containing the parsed version
   * @param iiifCollection - Source data of IIIF Collection
   * @param majorVersion - IIIF API version of Collection. If not provided, it will be determined automatically
   * @returns Parsed IIIF Collection
   * @static
   */
  static parse(
    iiifCollection: unknown,
    majorVersion: MajorVersion | null = null
  ) {
    let parsedCollection

    if (majorVersion === 2) {
      parsedCollection = Collection2Schema.parse(iiifCollection)
    } else if (majorVersion === 3) {
      parsedCollection = Collection3Schema.parse(iiifCollection)
    } else {
      parsedCollection = CollectionSchema.parse(iiifCollection)
    }

    return new Collection(parsedCollection)
  }
}

/**
 * Parsed IIIF Collection
 *
 * @property uri - URI of Collection
 * @property label - Label of Collection
 * @property items - Items in Collection
 * @property majorVersion - IIIF API version of Collection
 * @property type - Resource type, equals 'collection'
 */
export class Collection extends EmbeddedCollection {
  items: (Collection | EmbeddedCollection | Manifest | EmbeddedManifest)[] = []

  embedded = false

  constructor(parsedCollection: CollectionType) {
    super(parsedCollection)

    if ('@type' in parsedCollection) {
      // IIIF Presentation API 2.0

      const manifests =
        'manifests' in parsedCollection && parsedCollection.manifests
          ? parsedCollection.manifests
          : []

      const collections =
        'collections' in parsedCollection && parsedCollection.collections
          ? parsedCollection.collections
          : []

      const members =
        'members' in parsedCollection && parsedCollection.members
          ? parsedCollection.members
          : []

      const items = [...manifests, ...collections, ...members]

      this.items = items.map((item) => {
        if (item['@type'] === 'sc:Collection') {
          return new Collection(item)
        } else {
          return new EmbeddedManifest(item)
        }
      })
    } else if ('type' in parsedCollection) {
      // IIIF Presentation API 3.0

      if ('items' in parsedCollection) {
        this.items = parsedCollection.items.map((item) => {
          if (item.type === 'Collection') {
            if ('items' in item) {
              return new Collection(item)
            } else {
              return new EmbeddedCollection(item)
            }
          } else {
            return new EmbeddedManifest(item)
          }
        })
      }
    } else {
      // TODO: improve error message
      throw new Error('Unsupported Collection')
    }
  }

  /**
   * Parses a IIIF Collection and returns a [Collection](#collection) containing the parsed version
   * @param iiifCollection - Source data of IIIF Collection
   * @param majorVersion - IIIF API version of Collection. If not provided, it will be determined automatically
   * @returns Parsed IIIF Collection
   */
  static parse(
    iiifCollection: unknown,
    majorVersion: MajorVersion | null = null
  ) {
    let parsedCollection

    if (majorVersion === 2) {
      parsedCollection = Collection2Schema.parse(iiifCollection)
    } else if (majorVersion === 3) {
      parsedCollection = Collection3Schema.parse(iiifCollection)
    } else {
      parsedCollection = CollectionSchema.parse(iiifCollection)
    }

    return new Collection(parsedCollection)
  }

  get canvases(): Canvas[] {
    const initialValue: Canvas[] = []

    return this.items.reduce((canvases, item) => {
      if (item instanceof Manifest) {
        return [...canvases, ...item.canvases]
      } else if (item instanceof EmbeddedManifest) {
        return canvases
      } else if (item instanceof Collection) {
        return [...canvases, ...item.canvases]
      }

      return canvases
    }, initialValue)
  }

  get images(): (Image | EmbeddedImage)[] {
    return this.canvases.map((canvas) => canvas.image)
  }

  async fetchAll(
    options?: Partial<FetchNextOptions>
  ): Promise<FetchNextResults<Collection | Manifest | Image>[]> {
    const results: FetchNextResults<Collection | Manifest | Image>[] = []

    for await (const next of this.fetchNext(options)) {
      results.push(next)
    }

    return results
  }

  async *fetchNext(
    options?: Partial<FetchNextOptions>,
    depth = 0
  ): AsyncGenerator<
    FetchNextResults<Collection | Manifest | Image>,
    void,
    void
  > {
    options = {
      ...defaulfFetchNextOptions,
      ...options
    }

    if (Number.isNaN(options.maxDepth)) {
      return
    }

    if (options.maxDepth === undefined) {
      options.maxDepth = defaulfFetchNextOptions.maxDepth
    }

    if (options.fetchImages === undefined) {
      options.fetchImages = defaulfFetchNextOptions.fetchImages
    }

    if (options.fetchManifests === undefined) {
      options.fetchManifests = defaulfFetchNextOptions.fetchManifests
    }

    let fetchFn = defaulfFetchNextOptions.fetchFn
    if (options.fetchFn) {
      fetchFn = options.fetchFn
    }

    if (depth >= options.maxDepth) {
      return
    }

    for (const itemIndex in this.items) {
      let item = this.items[itemIndex]

      if (item instanceof Manifest) {
        if (options.fetchImages) {
          yield* item.fetchNext(fetchFn, depth + 1)
        }
      } else if (item instanceof EmbeddedManifest && options.fetchManifests) {
        const manifestUri = item.uri
        const iiifManifest = await fetchFn(manifestUri).then((response) =>
          response.json()
        )
        const newParsedManifest = Manifest.parse(iiifManifest)

        this.items[itemIndex] = newParsedManifest

        yield {
          item: newParsedManifest,
          depth: depth + 1,
          parent: {
            uri: this.uri,
            type: this.type
          }
        }

        if (depth + 1 < options.maxDepth && options.fetchImages) {
          yield* newParsedManifest.fetchNext(fetchFn, depth + 2)
        }
      } else if (
        item instanceof EmbeddedCollection &&
        options.fetchCollections
      ) {
        const collectionUri = item.uri
        const iiifCollection = await fetchFn(collectionUri).then((response) =>
          response.json()
        )
        const newParsedCollection = Collection.parse(iiifCollection)

        this.items[itemIndex] = newParsedCollection

        yield {
          item: newParsedCollection,
          depth: depth + 1,
          parent: {
            uri: this.uri,
            type: this.type
          }
        }

        item = newParsedCollection

        if (depth + 1 < options.maxDepth) {
          yield* newParsedCollection.fetchNext(options, depth + 2)
        }
      }
    }
  }
}
