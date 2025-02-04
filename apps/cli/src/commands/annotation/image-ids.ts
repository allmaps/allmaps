import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

export function imageIds() {
  return new Command('image-ids')
    .argument('[files...]')
    .summary('read all IIIF Image IDs from a Georeference Annotation')
    .description('Reads all IIIF image ID from a Georeference Annotation')
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files)

      const maps = parseAnnotationsValidateMaps(jsonValues)
      const imageIds = new Set(maps.map((map) => map.resource.id))

      printString([...imageIds].join('\n'))
    })
}
