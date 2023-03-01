import { generateAnnotation } from '@allmaps/annotation'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

import type { ArgumentsCamelCase } from 'yargs'

const command = 'generate [file...]'

const describe = 'Generates a single Georeference Annotation from input files'

const builder = {}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonInput(argv.file as string[])
  const maps = parseAnnotationsValidateMaps(jsonValues)

  const annotation = generateAnnotation(maps)
  printJson(annotation)
}

export default {
  command,
  describe,
  builder,
  handler
}
