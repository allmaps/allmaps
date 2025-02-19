import { Command } from '@commander-js/extra-typings'
import { fromZodError } from 'zod-validation-error'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseIiif } from '../../lib/iiif.js'
import { addParseIiifOptions } from '../../lib/options.js'

import type { ZodError } from 'zod'

import type {
  Image as IIIFImage,
  Manifest as IIIFManifest,
  EmbeddedManifest as EmbeddedIIIFManifest,
  Collection as IIIFCollection,
  EmbeddedCollection as EmbeddedIIIFCollection
} from '@allmaps/iiif-parser'

function isCollection(
  item:
    | IIIFManifest
    | EmbeddedIIIFManifest
    | IIIFCollection
    | EmbeddedIIIFCollection
): item is IIIFCollection {
  return (
    item.type === 'collection' && item.embedded === false && 'items' in item
  )
}

function collectImageIds(
  parsedIiifs: (IIIFImage | IIIFManifest | IIIFCollection)[]
) {
  const imageIds: string[] = []

  for (const parsedIiif of parsedIiifs) {
    if (parsedIiif.type === 'image') {
      imageIds.push(parsedIiif.uri)
    } else if (parsedIiif.type === 'manifest') {
      imageIds.push(...parsedIiif.canvases.map((canvas) => canvas.image.uri))
    } else if (parsedIiif.type === 'collection' && 'items' in parsedIiif) {
      const collectionImageIds = parsedIiif.items
        .filter((item) => isCollection(item))
        .map((item) => collectImageIds([item]))

      imageIds.push(...collectionImageIds.flat())
    }
  }

  return imageIds
}

export function imageIds() {
  const command = addParseIiifOptions(
    new Command('image-ids')
      .argument('[files...]')
      .summary('read all IIIF Image IDs from IIIF resources')
      .description('Reads all IIIF Image IDs from IIIF resources')
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)

    const parsedIiifs = []
    for (const jsonValue of jsonValues) {
      try {
        const parseIiifOptions = {
          fetchCollections: options.fetchCollections,
          fetchManifests: options.fetchManifests,
          fetchImages: options.fetchImages,
          fetchAll: options.fetchAll,
          maxDepth: options.fetchMaxDepth
        }

        const parsedIiif = await parseIiif(jsonValue, parseIiifOptions)
        parsedIiifs.push(parsedIiif)
      } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') {
          const zodError = err as ZodError
          const validationError = fromZodError(zodError)
          console.error(validationError.toString())
        } else if (err instanceof Error) {
          console.error(err.message)
        }
      }
    }

    const imageIds = new Set(collectImageIds(parsedIiifs))

    printString([...imageIds].join('\n'))
  })
}
