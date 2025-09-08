import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps
} from '../../lib/parse.js'
import {
  svgGeometriesToSvgString,
  mapToResourceMaskSvgPolygon
} from '@allmaps/stdlib'
import { addAnnotationInputOptions } from '../../lib/options.js'

export function svg() {
  const command = addAnnotationInputOptions(
    new Command('svg')
      .argument('[files...]')
      .summary('generate SVG from resource mask')
      .description(
        'Generates SVG from resource masks of input Georeference Annotations'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)

    const polygons = maps.map(mapToResourceMaskSvgPolygon)
    const svg = svgGeometriesToSvgString(polygons)
    printString(svg)
  })
}
