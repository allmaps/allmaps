import type { ArgumentsCamelCase } from 'yargs'

import svg from './transform/svg.js'
import geojson from './transform/geojson.js'
import pixelMask from './transform/pixel-mask.js'

const command = 'transform -a <annotation> [file...]'

const describe = `Transforms SVGs with pixel coordinates to GeoJSON, based on a Georef Annotation. Instead of supplying input files, you can also use the standard input.`

function builder(yargs: any) {
  return yargs
    .command(svg)
    .command(geojson)
    .command(pixelMask)
    .demandCommand(1, '')
}

async function handler(argv: ArgumentsCamelCase) {}

export default {
  command,
  describe,
  builder,
  handler
}
