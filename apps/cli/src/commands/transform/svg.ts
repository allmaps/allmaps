import { parseJsonFromFile, readInput, printJson } from '../../lib/io.js'
import { parseAnnotationValidateMap } from '../../lib/parse.js'
import { geomEach } from '../../lib/svg.js'

import type { ArgumentsCamelCase } from 'yargs'

const command = 'svg [file...]'

const describe = 'Transforms SVG to GeoJSON'

const builder = {
  annotation: {
    alias: 'a',
    description: 'Filename of Georeference Annotation',
    demandOption: true
  }
}

async function handler(argv: ArgumentsCamelCase) {
  const annotation = parseJsonFromFile(argv.annotation as string)
  const mapOrMaps = parseAnnotationValidateMap(annotation)

  if (Array.isArray(mapOrMaps)) {
    throw new Error('Annotation must contain exactly 1 georeferenced map')
  }

  const svgs = await readInput(argv.file as string[])

  for (let svg of svgs) {
    for (let geometry of geomEach(svg)) {
      console.log(geometry)
    }
  }

  // read SVG from input
}

export default {
  command,
  describe,
  builder,
  handler
}
