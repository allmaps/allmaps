import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import {
  svgGeometriesToSvgString,
  mapToResourceMaskSvgPolygon
} from '@allmaps/stdlib'

export default function svg() {
  return new Command('svg')
    .argument('[files...]')
    .summary('generate SVG from resource mask')
    .description(
      'Generates SVG from resource masks of input Georeference Annotations'
    )
    .action(async (files) => {
      const jsonValues = await parseJsonInput(files)
      const maps = parseAnnotationsValidateMaps(jsonValues)

      const polygons = maps.map(mapToResourceMaskSvgPolygon)
      const svg = svgGeometriesToSvgString(polygons)
      printString(svg)
    })
}
