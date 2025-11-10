import { z } from 'zod'

import {
  Collection2Schema,
  Collection3Schema,
  CollectionSchema
} from '../schemas/iiif.js'

import {
  EmbeddedCollection2Schema,
  EmbeddedManifest2Schema
} from '../schemas/presentation.2.js'
import {
  EmbeddedCollection3Schema,
  EmbeddedManifest3Schema
} from '../schemas/presentation.3.js'

import { EmbeddedManifest, Manifest } from './manifest.js'
import type { Image, EmbeddedImage } from './image.js'
import type { Canvas } from './canvas.js'

import type {
  LanguageString,
  MajorVersion,
  FetchNextItemOptions,
  FetchNextItemResults,
  Metadata,
  NavDate,
  NavPlace,
  Thumbnail,
  SeeAlso,
  Summary,
  RequiredStatement,
  Annotations,
  Homepage,
  Rendering,
  ParseOptions,
  ConstructorOptions
} from '../lib/types.js'

import {
  parseVersion2String,
  parseVersion3String,
  parseVersion2Metadata,
  parseVersion3Metadata,
  parseVersion2Attribution,
  parseVersion2Thumbnail,
  parseVersion2Rendering,
  parseVersion2Related
} from '../lib/convert.js'

type CollectionType = z.infer<typeof CollectionSchema>
type EmbeddedCollectionType =
  | z.infer<typeof EmbeddedCollection2Schema>
  | z.infer<typeof EmbeddedCollection3Schema>

type EmbeddedManifestType =
  | z.infer<typeof EmbeddedManifest2Schema>
  | z.infer<typeof EmbeddedManifest3Schema>

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

  label?: LanguageString
  description?: LanguageString
  metadata?: Metadata
  navDate?: NavDate
  navPlace?: NavPlace
  thumbnail?: Thumbnail

  embedded = true

  constructor(parsedCollection: CollectionType | EmbeddedCollectionType) {
    if ('@type' in parsedCollection) {
      // IIIF Presentation API 2.0

      this.uri = parsedCollection['@id']
      this.majorVersion = 2

      this.label = parseVersion2String(parsedCollection.label)
      this.description = parseVersion2String(parsedCollection.description)
      this.metadata = parseVersion2Metadata(parsedCollection.metadata)
      this.thumbnail = parseVersion2Thumbnail(parsedCollection.thumbnail)
      this.navDate = parsedCollection.navDate
      this.navPlace = parsedCollection.navPlace
    } else if ('type' in parsedCollection) {
      // IIIF Presentation API 3.0

      this.uri = parsedCollection.id
      this.majorVersion = 3

      this.label = parseVersion3String(parsedCollection.label)
      this.description = parseVersion3String(parsedCollection.description)
      this.metadata = parseVersion3Metadata(parsedCollection.metadata)
      this.navDate = parsedCollection.navDate
      this.navPlace = parsedCollection.navPlace
      this.thumbnail = parsedCollection.thumbnail
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
  static parse(iiifCollection: unknown, options?: Partial<ParseOptions>) {
    const { majorVersion, keepSource } = options || {}

    let parsedCollection

    if (majorVersion === 2) {
      parsedCollection = Collection2Schema.parse(iiifCollection)
    } else if (majorVersion === 3) {
      parsedCollection = Collection3Schema.parse(iiifCollection)
    } else {
      parsedCollection = CollectionSchema.parse(iiifCollection)
    }

    return new Collection(
      parsedCollection,
      keepSource ? { source: iiifCollection } : {}
    )
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
  source?: unknown

  items: (Collection | EmbeddedCollection | Manifest | EmbeddedManifest)[] = []

  embedded = false

  homepage?: Homepage
  rendering?: Rendering
  seeAlso?: SeeAlso
  summary?: Summary
  requiredStatement?: RequiredStatement

  annotations?: Annotations

  constructor(
    parsedCollection: CollectionType,
    options?: Partial<ConstructorOptions>
  ) {
    super(parsedCollection)

    this.source = options?.source

    if ('@type' in parsedCollection) {
      // IIIF Presentation API 2.0

      this.requiredStatement = parseVersion2Attribution(
        parsedCollection.attribution
      )

      this.rendering = parseVersion2Rendering(parsedCollection.rendering)
      this.homepage = parseVersion2Related(parsedCollection.related)

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

      this.items = items.map((item) => this.#itemConstructor(item))
    } else if ('type' in parsedCollection) {
      // IIIF Presentation API 3.0

      this.homepage = parsedCollection.homepage
      this.rendering = parsedCollection.rendering
      this.seeAlso = parsedCollection.seeAlso
      this.summary = parsedCollection.summary
      this.requiredStatement = parsedCollection.requiredStatement

      this.annotations = parsedCollection.annotations

      if ('items' in parsedCollection) {
        this.items = parsedCollection.items.map((item) =>
          this.#itemConstructor(item)
        )
      }
    } else {
      // TODO: improve error message
      throw new Error('Unsupported Collection')
    }
  }

  #itemConstructor(
    parsedItem: EmbeddedCollectionType | CollectionType | EmbeddedManifestType
  ) {
    if ('@type' in parsedItem) {
      if (parsedItem['@type'] === 'sc:Collection') {
        const hasItems =
          'manifests' in parsedItem ||
          'collections' in parsedItem ||
          'members' in parsedItem

        if (hasItems) {
          return new Collection(parsedItem)
        } else {
          return new EmbeddedCollection(parsedItem)
        }
      } else if (parsedItem['@type'] === 'sc:Manifest') {
        return new EmbeddedManifest(parsedItem)
      }
    } else if ('type' in parsedItem) {
      if (parsedItem.type === 'Collection') {
        if ('items' in parsedItem) {
          return new Collection(parsedItem)
        } else {
          return new EmbeddedCollection(parsedItem)
        }
      } else if (parsedItem.type === 'Manifest') {
        return new EmbeddedManifest(parsedItem)
      }
    }

    throw new Error('Unsupported Collection item')
  }

  /**
   * Parses a IIIF Collection and returns a [Collection](#collection) containing the parsed version
   * @param iiifCollection - Source data of IIIF Collection
   * @param majorVersion - IIIF API version of Collection. If not provided, it will be determined automatically
   * @returns Parsed IIIF Collection
   */
  static parse(iiifCollection: unknown, options?: Partial<ParseOptions>) {
    const { majorVersion, keepSource } = options || {}

    let parsedCollection

    if (majorVersion === 2) {
      parsedCollection = Collection2Schema.parse(iiifCollection)
    } else if (majorVersion === 3) {
      parsedCollection = Collection3Schema.parse(iiifCollection)
    } else {
      parsedCollection = CollectionSchema.parse(iiifCollection)
    }

    return new Collection(
      parsedCollection,
      keepSource
        ? {
            source: iiifCollection
          }
        : {}
    )
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

  async fetchItemWithIndex(index: number, fetchFn = fetch) {
    const item = this.items[index]

    if (item.type === 'manifest' && item.embedded === true) {
      const manifestUri = item.uri
      const iiifManifest = await fetchFn(manifestUri).then((response) =>
        response.json()
      )

      const newParsedManifest = Manifest.parse(iiifManifest, {
        keepSource: this.source !== undefined
      })

      this.items[index] = newParsedManifest
    } else if (item.type === 'collection' && item.embedded === true) {
      const collectionUri = item.uri
      const iiifCollection = await fetchFn(collectionUri).then((response) =>
        response.json()
      )
      const newParsedCollection = Collection.parse(iiifCollection, {
        keepSource: this.source !== undefined
      })
      this.items[index] = newParsedCollection
    }

    return this.items[index]
  }

  async fetchItemWithId(id: string, fetchFn = fetch) {
    const index = this.items.findIndex((item) => item.uri === id)
    if (index >= 0) {
      return await this.fetchItemWithIndex(index, fetchFn)
    }
  }

  getItemAtPath(path: number[]) {
    let parsedIiif:
      | Collection
      | EmbeddedCollection
      | Manifest
      | EmbeddedManifest
      | Canvas = this as Collection

    for (const index of path) {
      if ('items' in parsedIiif) {
        parsedIiif = parsedIiif.items[index]
      } else if ('canvases' in parsedIiif) {
        parsedIiif = parsedIiif.canvases[index] as Canvas
      } else {
        return undefined
      }

      // If we navigated to an invalid index, return undefined
      if (!parsedIiif) {
        return undefined
      }
    }

    return parsedIiif
  }

  async fetchUntilPath(path: number[]) {
    let parsedCollection = this as Collection
    for (const index of path) {
      const item = parsedCollection.items[index]
      if (item && item.embedded === true) {
        await parsedCollection.fetchItemWithIndex(index)
      }

      if (parsedCollection.items[index] instanceof Collection) {
        parsedCollection = parsedCollection.items[index]
      } else {
        break
      }
    }
  }

  async fetchAllItems(
    options?: Partial<FetchNextItemOptions>
  ): Promise<FetchNextItemResults<Collection | Manifest | Image>[]> {
    const results: FetchNextItemResults<Collection | Manifest | Image>[] = []

    for await (const next of this.fetchNextItem(options)) {
      results.push(next)
    }

    return results
  }

  async *fetchNextItem(
    options?: Partial<FetchNextItemOptions>,
    depth = 0
  ): AsyncGenerator<
    FetchNextItemResults<Collection | Manifest | Image>,
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

    for (const [index, item] of this.items.entries()) {
      if (item instanceof Manifest) {
        if (options.fetchImages) {
          yield* item.fetchNextItem(fetchFn, depth + 1)
        }
      } else if (
        item.type === 'manifest' &&
        item.embedded === true &&
        options.fetchManifests
      ) {
        const newParsedManifest = await this.fetchItemWithIndex(index)

        if (newParsedManifest instanceof Manifest) {
          yield {
            item: newParsedManifest,
            depth: depth + 1,
            parent: {
              uri: this.uri,
              type: this.type
            }
          }

          if (depth + 1 < options.maxDepth && options.fetchImages) {
            yield* newParsedManifest.fetchNextItem(fetchFn, depth + 2)
          }
        }
      } else if (
        item.type === 'collection' &&
        item.embedded === true &&
        options.fetchCollections
      ) {
        const newParsedCollection = await this.fetchItemWithIndex(index)

        if (newParsedCollection instanceof Collection) {
          yield {
            item: newParsedCollection,
            depth: depth + 1,
            parent: {
              uri: this.uri,
              type: this.type
            }
          }

          if (depth + 1 < options.maxDepth) {
            yield* newParsedCollection.fetchNextItem(options, depth + 2)
          }
        }
      }
    }
  }
}
