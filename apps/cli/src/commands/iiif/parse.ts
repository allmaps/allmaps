import { Command } from 'commander'

import { IIIF } from '@allmaps/iiif-parser'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { getIssues, formatIssue } from '../../lib/errors.js'

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

      let parsedIiif = []
      for (let jsonValue of jsonValues) {
        try {
          parsedIiif.push(IIIF.parse(jsonValue))
        } catch (err) {
          if (err instanceof Error && err.name === 'ZodError') {
            const zodError = err as ZodError
            const issues = getIssues(jsonValue, zodError)

            issues.forEach((issue) => {
              console.error(formatIssue(issue))
            })
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
