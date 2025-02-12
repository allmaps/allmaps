import { Command } from '@commander-js/extra-typings'
import { fromZodError } from 'zod-validation-error'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseIiif } from '../../lib/iiif.js'
import { addParseIiifOptions } from '../../lib/options.js'

import type { ZodError } from 'zod'

export function parse() {
  const command = addParseIiifOptions(
    new Command('parse')
      .argument('[files...]')
      .summary('parse IIIF resources')
      .description(
        'Parses IIIF resources and outputs them in the internal format used by Allmaps'
      )
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

    if (parsedIiifs.length) {
      if (jsonValues.length === 1) {
        printJson({ ...parsedIiifs[0] })
      } else {
        printJson({ ...parsedIiifs })
      }
    }
  })
}
