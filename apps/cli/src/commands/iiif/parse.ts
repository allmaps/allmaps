import { Command } from 'commander'
import { fromZodError } from 'zod-validation-error'

import { IIIF } from '@allmaps/iiif-parser'

import { parseJsonInput, printJson } from '../../lib/io.js'

import type { ZodError } from 'zod'

export default function parse() {
  return new Command('parse')
    .argument('[files...]')
    .summary('parse IIIF resources')
    .description(
      'Parses IIIF resources and outputs them in the internal format used by Allmaps'
    )
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files as string[])

      const parsedIiif = []
      for (const jsonValue of jsonValues) {
        try {
          parsedIiif.push(IIIF.parse(jsonValue))
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

      if (parsedIiif.length) {
        if (jsonValues.length === 1) {
          printJson({ ...parsedIiif[0] })
        } else {
          printJson({ ...parsedIiif })
        }
      }
    })
}
