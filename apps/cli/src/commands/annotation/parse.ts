import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printJson } from '../../lib/io.ts'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps
} from '../../lib/parse.ts'
import { addAnnotationInputOptions } from '../../lib/options.ts'

export function parse() {
  const command = addAnnotationInputOptions(
    new Command('parse')
      .argument('[files...]')
      .summary('parse Georeference Annotation')
      .description(
        "Parse and validate Georeference Annotations to Georeferenced Maps - Allmaps' internal map format"
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)

    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)
    printJson(maps)
  })
}
