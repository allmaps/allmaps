import { z } from 'zod'

import { ManifestSchema } from '../schemas/iiif.js'
import { Canvas } from './canvas.js'

import type { LanguageString, Metadata, MajorVersion } from '../lib/types.js'
import { parseVersion2String, parseVersion2Metadata } from '../lib/strings.js'

type ManifestType = z.infer<typeof ManifestSchema>

// type FetchFunction = (url: string) => Promise<any>

// interface FetchNextOptions {
//   maxDepth: number
//   maxItems: number
// }

// export class FetchedEvent extends Event {
//   image: Image

//   constructor(image: Image) {
//     super('fetched')
//     this.image = image
//   }
// }

export class Manifest extends EventTarget {
  uri: string
  type = 'manifest'
  majorVersion: MajorVersion
  canvases: Canvas[] = []

  label?: LanguageString
  description?: LanguageString
  metadata?: Metadata

  constructor(parsedManifest: ManifestType) {
    super()

    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      this.uri = parsedManifest['@id']
      this.majorVersion = 2

      if (parsedManifest.label) {
        this.label = parseVersion2String(parsedManifest.label)
      }

      if (parsedManifest.description) {
        this.description = parseVersion2String(parsedManifest.description)
      }

      this.metadata = parseVersion2Metadata(parsedManifest.metadata)

      const sequence = parsedManifest.sequences[0]
      this.canvases = sequence.canvases.map((canvas) => new Canvas(canvas))
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.uri = parsedManifest.id
      this.majorVersion = 3

      this.label = parsedManifest.label
      this.metadata = parsedManifest.metadata

      this.canvases = parsedManifest.items.map((canvas) => new Canvas(canvas))
    } else {
      throw new Error('Unsupported Manifest')
    }
  }

  static parse(iiifData: any) {
    const parsedManifest = ManifestSchema.parse(iiifData)
    return new Manifest(parsedManifest)
  }

  // const options = {
  //   maxDepth: 2,
  //   maxItems: 10,
  //   images: true,
  //   manifests: true,
  //   collections: false
  // }

  // async *fetchNextImages(
  //   fetch: FetchFunction
  //   // options: FetchNextOptions = { maxDepth: 2, maxItems: 10 }
  // ) {
  //   for (const imageIndex in this.images) {
  //     const image = this.images[imageIndex]
  //     if (image instanceof EmbeddedImage) {
  //       const url = `${image.uri}/info.json`

  //       const iiifData = await fetch(url)
  //       const newImage = Image.parse(iiifData)

  //       this.images[imageIndex] = newImage
  //       yield newImage
  //     }
  //   }
  // }

  // async fetchNextImages2(
  //   fetch: FetchFunction
  //   // options: FetchNextOptions = { maxDepth: 2, maxItems: 10 }
  // ) {
  //   for (const imageIndex in this.images) {
  //     const image = this.images[imageIndex]
  //     if (image instanceof EmbeddedImage) {
  //       const url = `${image.uri}/info.json`

  //       const iiifData = await fetch(url)
  //       const newImage = Image.parse(iiifData)

  //       this.images[imageIndex] = newImage

  //       const event = new FetchedEvent(newImage)
  //       this.dispatchEvent(event)
  //     }
  //   }
  // }
}
