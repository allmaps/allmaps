import { Command } from 'commander'

import { parseJsonInput, print } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import { createSvgString, resourceMaskToSvgPolygon } from '../../lib/svg.js'

export default function svg() {
  return new Command('svg')
    .argument('[files...]')
    .summary('generate SVG from resource mask')
    .description(
      'Generates SVG from resource masks of input Georeference Annotations'
    )
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files as string[])
      const maps = parseAnnotationsValidateMaps(jsonValues)

      const polygons = maps.map(resourceMaskToSvgPolygon)
      const svg = createSvgString(polygons)
      print(svg)
    })
}
