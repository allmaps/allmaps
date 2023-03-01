import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

import type { ArgumentsCamelCase } from 'yargs'

const command = 'parse [file...]'

const describe =
  "Parses and validates Georef Annotations and outputs Allmaps' internal Georef format."

const builder = {}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonInput(argv.file as string[])

  const maps = parseAnnotationsValidateMaps(jsonValues)

  if (maps.length === 1) {
    printJson(maps[0])
  } else {
    printJson(maps)
  }
}

export default {
  command,
  describe,
  builder,
  handler
}
