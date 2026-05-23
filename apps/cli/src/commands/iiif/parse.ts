import { Command } from '@commander-js/extra-typings'
import { prettifyError, ZodError } from 'zod'

import { parseJsonInput, printJson } from '../../lib/io.ts'
import { parseIiif } from '../../lib/iiif.ts'
import { addParseIiifOptions } from '../../lib/options.ts'

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
        if (err instanceof ZodError) {
          console.error(prettifyError(err))
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
