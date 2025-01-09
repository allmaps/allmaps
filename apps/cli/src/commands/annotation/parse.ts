import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

export default function parse() {
  return new Command('parse')
    .argument('[files...]')
    .summary('parse Georeference Annotation')
    .description(
      "Parses and validates Georeference Annotations and outputs Allmaps' internal format"
    )
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files)

      const maps = parseAnnotationsValidateMaps(jsonValues)
      printJson(maps)
    })
}
