import { Command } from 'commander'

import { parseJsonInput, print } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import { createSvgString, pixelMaskToSvgPolygon } from '../../lib/svg.js'

export default function svg() {
  return new Command('svg')
    .argument('[files...]')
    .summary('generate SVG from pixel mask')
    .description(
      'Generates SVG from pixel masks of input Georeference Annotations'
    )
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files as string[])
      const maps = parseAnnotationsValidateMaps(jsonValues)

      const polygons = maps.map(pixelMaskToSvgPolygon)
      const svg = createSvgString(polygons)
      print(svg)
    })
}
