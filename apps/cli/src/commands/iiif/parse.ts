import { IIIF, Image } from '@allmaps/iiif-parser'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { generateManifest } from '../../lib/iiif.js'
import { getIssues, formatIssue } from '../../lib/errors.js'

import type { ArgumentsCamelCase } from 'yargs'

import type { ZodError } from 'zod'

const command = 'parse [file...]'

const describe = 'Parses and generates IIIF data'

const builder = {
  // format: {
  //   alias: 'f',
  //   choices: ['parse', 'manifest'],
  //   default: 'parse',
  //   description: 'Choose output format'
  // }
}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonInput(argv.file as string[])

  let parsedIiif = []

  for (let jsonValue of jsonValues) {
    try {
      parsedIiif.push(IIIF.parse(jsonValue))
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') {
        const zodError = err as ZodError
        const issues = getIssues(jsonValue, zodError)

        issues.forEach((issue) => {
          console.log(formatIssue(issue))
        })
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
}

export default {
  command,
  describe,
  builder,
  handler
}
