import { Command } from '@commander-js/extra-typings'

import { generateAnnotation } from '@allmaps/annotation'

import { parseJsonInput, printJson } from '../../lib/io.js'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps
} from '../../lib/parse.js'
import { addAnnotationInputOptions } from '../../lib/options.js'

export function generate() {
  const command = addAnnotationInputOptions(
    new Command('generate')
      .argument('[files...]')
      .summary('generate Georeference Annotation')
      .description(
        "Generate a single Georeference Annotation from json files containing Georeferenced Maps - Allmaps' internal map format"
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)

    let annotation: unknown
    if (maps.length === 1) {
      annotation = generateAnnotation(maps[0])
    } else {
      annotation = generateAnnotation(maps)
    }

    printJson(annotation)
  })
}
