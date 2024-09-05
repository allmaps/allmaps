import { Command } from 'commander'
import { fromZodError } from 'zod-validation-error'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseIiif } from '../../lib/iiif.js'
import { addParseIiifOptions } from '../../lib/options.js'

import type { ZodError } from 'zod'

export default function parse() {
  let command = new Command('parse')
    .argument('[files...]')
    .summary('parse IIIF resources')
    .description(
      'Parses IIIF resources and outputs them in the internal format used by Allmaps'
    )

  command = addParseIiifOptions(command)

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files as string[])

    const parsedIiifs = []
    for (const jsonValue of jsonValues) {
      try {
        const parseIiifOptions = {
          fetchCollections: options.fetchCollections as boolean,
          fetchManifests: options.fetchManifests as boolean,
          fetchImages: options.fetchImages as boolean,
          fetchAll: options.fetchAll as boolean
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
