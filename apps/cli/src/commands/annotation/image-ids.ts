import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printString } from '../../lib/io.ts'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps
} from '../../lib/parse.ts'
import { addAnnotationInputOptions } from '../../lib/options.ts'

export function imageIds() {
  const command = addAnnotationInputOptions(
    new Command('image-ids')
      .argument('[files...]')
      .summary('read all IIIF Image IDs from a Georeference Annotation')
      .description('Reads all IIIF image ID from a Georeference Annotation')
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)

    const imageIds = new Set(maps.map((map) => map.resource.id))

    printString([...imageIds].join('\n'))
  })
}
