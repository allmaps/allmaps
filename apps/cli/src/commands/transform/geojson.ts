import { Command } from '@commander-js/extra-typings'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseTransformOptions } from '../../lib/parse.js'
import { getTransformerFromOptions } from '../../lib/transformer.js'
import {
  addAnnotationOptions,
  addCoordinateTransformOptions
} from '../../lib/options.js'
import { isGeojsonGeometry, svgGeometriesToSvgString } from '@allmaps/stdlib'

export function geojson() {
  const command = addCoordinateTransformOptions(
    addAnnotationOptions(
      new Command('geojson')
        .argument('[files...]')
        .summary('transform GeoJSON to SVG')
        .description(
          'Transform GeoJSON to SVG using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.'
        )
    )
  )

  return command.action(async (files, options) => {
    const transformOptions = parseTransformOptions(options)
    const transformer = getTransformerFromOptions(options)

    if (options.inverse) {
      throw new Error('Inverse transformation not supported for this command')
    }

    const geojsonGeometries = await parseJsonInput(files)

    // TODO: consider to use transformGeojsonFeatureCollectionToSvgString()
    const svgGeometries = []
    for (const geojsonGeometry of geojsonGeometries) {
      if (isGeojsonGeometry(geojsonGeometry)) {
        const svgGeometry = transformer.transformGeojsonToSvg(
          geojsonGeometry,
          transformOptions
        )
        svgGeometries.push(svgGeometry)
      } else {
        throw new Error(
          'Unsupported input. Only GeoJSON Points, LineStrings and Polygons are supported.'
        )
      }
    }

    const svg = svgGeometriesToSvgString(svgGeometries)
    printString(svg)
  })
}
