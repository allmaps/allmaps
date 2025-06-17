import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

export function parse() {
  return new Command('parse')
    .argument('[files...]')
    .summary('parse Georeference Annotation')
    .description(
      "Parse and validate Georeference Annotations to Georeferenced Maps - Allmaps' internal 'map' format"
    )
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files)

      const maps = parseAnnotationsValidateMaps(jsonValues)
      printJson(maps)
    })
}
