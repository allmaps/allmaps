import { z } from 'zod'

import {
  Manifest2Schema,
  Manifest3Schema,
  ManifestSchema
} from '../schemas/iiif.js'

import { EmbeddedManifest2Schema } from '../schemas/presentation.2.js'
import { EmbeddedManifest3Schema } from '../schemas/presentation.3.js'

import { Image } from './image.js'
import { Canvas } from './canvas.js'

import type {
  LanguageString,
  Metadata,
  MajorVersion,
  FetchFunction,
  FetchNextOptions,
  FetchNextResults
} from '../lib/types.js'
import { parseVersion2String, parseVersion2Metadata } from '../lib/strings.js'

type ManifestType = z.infer<typeof ManifestSchema>
type EmbeddedManifestType =
  | z.infer<typeof EmbeddedManifest2Schema>
  | z.infer<typeof EmbeddedManifest3Schema>

export class EmbeddedManifest {
  embedded = true

  uri: string
  type = 'manifest'

  label?: LanguageString

  majorVersion: MajorVersion

  constructor(parsedManifest: ManifestType | EmbeddedManifestType) {
    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      this.uri = parsedManifest['@id']
      this.majorVersion = 2

      if (parsedManifest.label) {
        this.label = parseVersion2String(parsedManifest.label)
      }
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.uri = parsedManifest.id
      this.majorVersion = 3

      this.label = parsedManifest.label
    } else {
      throw new Error('Unsupported Manifest')
    }
  }
}

export class Manifest extends EmbeddedManifest {
  canvases: Canvas[] = []

  description?: LanguageString
  metadata?: Metadata

  constructor(parsedManifest: ManifestType) {
    super(parsedManifest)

    this.embedded = false

    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      if (parsedManifest.description) {
        this.description = parseVersion2String(parsedManifest.description)
      }

      this.metadata = parseVersion2Metadata(parsedManifest.metadata)

      const sequence = parsedManifest.sequences[0]
      this.canvases = sequence.canvases.map((canvas) => new Canvas(canvas))
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.metadata = parsedManifest.metadata

      this.canvases = parsedManifest.items.map((canvas) => new Canvas(canvas))
    } else {
      throw new Error('Unsupported Manifest')
    }
  }

  static parse(iiifData: any, majorVersion: MajorVersion | null = null) {
    let parsedManifest

    if (majorVersion === 2) {
      parsedManifest = Manifest2Schema.parse(iiifData)
    } else if (majorVersion === 3) {
      parsedManifest = Manifest3Schema.parse(iiifData)
    } else {
      parsedManifest = ManifestSchema.parse(iiifData)
    }

    return new Manifest(parsedManifest)
  }

  async *fetchNext(
    fetch: FetchFunction,
    depth: number = 0
  ): AsyncGenerator<FetchNextResults<Image>, void, void> {
    for (const canvasIndex in this.canvases) {
      const canvas = this.canvases[canvasIndex]
      const image = canvas.image

      if (image.embedded) {
        const url = `${image.uri}/info.json`

        const iiifData = await fetch(url)
        const newImage = Image.parse(iiifData)

        canvas.image = newImage

        yield {
          item: newImage,
          depth,
          parent: {
            uri: this.uri,
            type: this.type
          }
        }
      }
    }
  }

  // TODO: implement fetchByUri function, also for collections
  // async fetchImageByUri(fetch: FetchFunction, uri: string) {
  //   //
  //   canvases
  // }
}
