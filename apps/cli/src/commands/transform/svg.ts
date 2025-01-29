import { Command } from '@commander-js/extra-typings'

import { readInput, printJson } from '../../lib/io.js'
import { parseTransformOptions } from '../../lib/parse.js'
import { getTransformerFromOptions } from '../../lib/transformer.js'
import {
  addAnnotationOptions,
  addCoordinateTransformOptions
} from '../../lib/options.js'
import {
  stringToSvgGeometriesGenerator,
  geometriesToFeatureCollection
} from '@allmaps/stdlib'

export function svg() {
  const command = addCoordinateTransformOptions(
    addAnnotationOptions(
      new Command('svg')
        .argument('[files...]')
        .summary('transform SVG to GeoJSON')
        .description(
          'Transform SVG to GeoJSON using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.'
        )
    )
  )

  return command.action(async (files, options) => {
    const transformOptions = parseTransformOptions(options)
    const transformer = getTransformerFromOptions(options)

    if (options.inverse) {
      throw new Error('Inverse transformation not supported for this command')
    }

    const svgs = await readInput(files)

    // TODO: consider to use transformSvgStringToGeojsonFeatureCollection()
    const geojsonGeometries = []
    for (const svg of svgs) {
      for (const svgGeometry of stringToSvgGeometriesGenerator(svg)) {
        const geojsonGeometry = transformer.transformSvgToGeojson(
          svgGeometry,
          transformOptions
        )
        geojsonGeometries.push(geojsonGeometry)
      }
    }

    const featureCollection = geometriesToFeatureCollection(geojsonGeometries)
    printJson(featureCollection)
  })
}
