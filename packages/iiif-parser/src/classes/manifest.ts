import { z } from 'zod'

import {
  Manifest2Schema,
  Manifest3Schema,
  ManifestSchema
} from '../schemas/iiif.js'

import { EmbeddedManifest2Schema } from '../schemas/presentation.2.js'
import { EmbeddedManifest3Schema } from '../schemas/presentation.3.js'

import { Image, EmbeddedImage } from './image.js'
import { Canvas } from './canvas.js'

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

import type {
  LanguageString,
  Metadata,
  MajorVersion,
  FetchNextResults,
  NavDate,
  NavPlace,
  Thumbnail,
  SeeAlso,
  Summary,
  RequiredStatement,
  Annotations,
  Homepage,
  Rendering
} from '../lib/types.js'

type ManifestType = z.infer<typeof ManifestSchema>
type EmbeddedManifestType =
  | z.infer<typeof EmbeddedManifest2Schema>
  | z.infer<typeof EmbeddedManifest3Schema>

const ManifestTypeString = 'manifest'

/**
 * Parsed IIIF Manifest, embedded in a Collection
 * @property embedded - Whether the Manifest is embedded in a Collection
 * @property uri - URI of Manifest
 * @property label - Label of Manifest
 * @property majorVersion - IIIF API version of Manifest
 * @property type - Resource type, equals 'manifest'
 */
export class EmbeddedManifest {
  readonly embedded: boolean = true

  uri: string
  type: typeof ManifestTypeString = ManifestTypeString

  label?: LanguageString

  majorVersion: MajorVersion

  constructor(parsedManifest: ManifestType | EmbeddedManifestType) {
    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      this.uri = parsedManifest['@id']
      this.majorVersion = 2

      this.label = parseVersion2String(parsedManifest.label)
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.uri = parsedManifest.id
      this.majorVersion = 3

      this.label = parseVersion3String(parsedManifest.label)
    } else {
      throw new Error('Unsupported Manifest')
    }
  }
}

/**
 * Parsed IIIF Manifest
 *
 * @property canvases - Array of parsed canvases
 * @property description - Description of Manifest
 * @property metadata - Metadata of Manifest
 */
export class Manifest extends EmbeddedManifest {
  canvases: Canvas[] = []

  description?: LanguageString
  metadata?: Metadata

  navDate?: NavDate
  navPlace?: NavPlace
  homepage?: Homepage
  thumbnail?: Thumbnail
  rendering?: Rendering
  seeAlso?: SeeAlso
  summary?: Summary
  requiredStatement?: RequiredStatement

  annotations?: Annotations

  readonly embedded = false

  constructor(parsedManifest: ManifestType) {
    super(parsedManifest)

    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0

      this.description = parseVersion2String(parsedManifest.description)
      this.metadata = parseVersion2Metadata(parsedManifest.metadata)

      const sequence = parsedManifest.sequences[0]
      this.canvases = sequence.canvases.map((canvas) => new Canvas(canvas))

      this.navDate = parsedManifest.navDate
      this.navPlace = parsedManifest.navPlace

      this.requiredStatement = parseVersion2Attribution(
        parsedManifest.attribution
      )
      this.thumbnail = parseVersion2Thumbnail(parsedManifest.thumbnail)
      this.rendering = parseVersion2Rendering(parsedManifest.rendering)
      this.homepage = parseVersion2Related(parsedManifest.related)
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0

      this.description = parseVersion3String(parsedManifest.description)
      this.metadata = parseVersion3Metadata(parsedManifest.metadata)

      this.metadata = parseVersion3Metadata(parsedManifest.metadata)

      this.navDate = parsedManifest.navDate
      this.navPlace = parsedManifest.navPlace
      this.homepage = parsedManifest.homepage
      this.thumbnail = parsedManifest.thumbnail
      this.rendering = parsedManifest.rendering
      this.seeAlso = parsedManifest.seeAlso
      this.summary = parsedManifest.summary
      this.requiredStatement = parsedManifest.requiredStatement

      this.annotations = parsedManifest.annotations

      this.canvases = parsedManifest.items.map((canvas) => new Canvas(canvas))
    } else {
      throw new Error('Unsupported Manifest')
    }
  }

  /**
   * Parses a IIIF resource and returns a [Manifest](#manifest) containing the parsed version
   * @param iiifManifest - Source data of IIIF Manifest
   * @param majorVersion - IIIF API version of Manifest. If not provided, it will be determined automatically
   * @returns Parsed IIIF Manifest
   */
  static parse(
    iiifManifest: unknown,
    majorVersion: MajorVersion | null = null
  ) {
    let parsedManifest

    if (majorVersion === 2) {
      parsedManifest = Manifest2Schema.parse(iiifManifest)
    } else if (majorVersion === 3) {
      parsedManifest = Manifest3Schema.parse(iiifManifest)
    } else {
      parsedManifest = ManifestSchema.parse(iiifManifest)
    }

    return new Manifest(parsedManifest)
  }

  get images() {
    return this.canvases.map((canvas) => canvas.image)
  }

  async #fetchImage(
    image: Image | EmbeddedImage,
    fetchFn: typeof fetch
  ): Promise<Image> {
    if (image instanceof EmbeddedImage) {
      const url = `${image.uri}/info.json`

      const iiifImage = await fetchFn(url).then((response) => response.json())
      const fetchedImage = Image.parse(iiifImage)
      return fetchedImage
    } else {
      return image
    }
  }

  async fetchAll(
    fetchFn: typeof fetch = globalThis.fetch
  ): Promise<FetchNextResults<Image>[]> {
    const results: FetchNextResults<Image>[] = []

    for await (const next of this.fetchNext(fetchFn)) {
      results.push(next)
    }

    return results
  }

  async *fetchNext(
    fetchFn: typeof fetch = globalThis.fetch,
    depth = 0
  ): AsyncGenerator<FetchNextResults<Image>, void, void> {
    for (const canvas of this.canvases) {
      const fetchedImage = await this.#fetchImage(canvas.image, fetchFn)
      canvas.image = fetchedImage

      yield {
        item: fetchedImage,
        depth,
        parent: {
          uri: this.uri,
          type: this.type
        }
      }
    }
  }

  // TODO: implement fetchByUri function, also for collections
  async fetchImageByUri(
    imageUri: string,
    fetchFn: typeof fetch = globalThis.fetch
  ) {
    for (const canvas of this.canvases) {
      if (canvas.image.uri === imageUri) {
        const fetchedImage = await this.#fetchImage(canvas.image, fetchFn)
        canvas.image = fetchedImage
        return fetchedImage
      }
    }
  }
}
