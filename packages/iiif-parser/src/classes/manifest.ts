import { z } from 'zod'

import { ManifestSchema } from '../schemas/iiif.js'
import { Image, EmbeddedImage } from './image.js'

type ManifestType = z.infer<typeof ManifestSchema>

type FetchFunction = (url: string) => Promise<any>

interface FetchNextOptions {
  maxDepth: number
  maxItems: number
}

type MajorVersion = 2 | 3

type ManifestImage = EmbeddedImage | Image

export class FetchedEvent extends Event {
  image: Image

  constructor(image: Image) {
    super('fetched')
    this.image = image
  }
}

export class Manifest extends EventTarget {
  uri: string
  majorVersion: MajorVersion
  images: ManifestImage[] = []

  label?: any

  // TODO: add label, metadata, description

  constructor(parsedManifest: ManifestType) {
    super()

    if ('@type' in parsedManifest) {
      // IIIF Presentation API 2.0
      this.uri = parsedManifest['@id']
      this.majorVersion = 2

      const canvases = parsedManifest.sequences[0].canvases
      this.images = canvases.map((canvas) => new EmbeddedImage(canvas))
    } else if ('type' in parsedManifest) {
      // IIIF Presentation API 3.0
      this.uri = parsedManifest.id
      this.majorVersion = 3

      this.label = parsedManifest.label

      const canvases = parsedManifest.items
      this.images = canvases.map((canvas) => new EmbeddedImage(canvas))
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

  async *fetchNextImages(
    fetch: FetchFunction
    // options: FetchNextOptions = { maxDepth: 2, maxItems: 10 }
  ) {
    for (const imageIndex in this.images) {
      const image = this.images[imageIndex]
      if (image instanceof EmbeddedImage) {
        const url = `${image.uri}/info.json`

        const iiifData = await fetch(url)
        const newImage = Image.parse(iiifData)

        this.images[imageIndex] = newImage
        yield newImage
      }
    }
  }

  async fetchNextImages2(
    fetch: FetchFunction
    // options: FetchNextOptions = { maxDepth: 2, maxItems: 10 }
  ) {
    for (const imageIndex in this.images) {
      const image = this.images[imageIndex]
      if (image instanceof EmbeddedImage) {
        const url = `${image.uri}/info.json`

        const iiifData = await fetch(url)
        const newImage = Image.parse(iiifData)

        this.images[imageIndex] = newImage

        const event = new FetchedEvent(newImage)
        this.dispatchEvent(event)
      }
    }
  }
}
