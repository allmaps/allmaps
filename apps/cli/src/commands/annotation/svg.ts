import { parseJsonInput } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import { generatePixelMapSvg } from '../../lib/svg.js'

import type { ArgumentsCamelCase } from 'yargs'

const command = 'svg [file...]'

const describe = 'Generates SVG from pixel masks of input Georef Annotations'

const builder = {}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonInput(argv.file as string[])
  const maps = parseAnnotationsValidateMaps(jsonValues)

  const svg = generatePixelMapSvg(maps)
  console.log(svg)
}

export default {
  command,
  describe,
  builder,
  handler
}
