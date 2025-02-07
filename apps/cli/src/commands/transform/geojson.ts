import { Command } from '@commander-js/extra-typings'

import { geojsonGeometriesToGeojsonFeatureCollection } from '@allmaps/stdlib'
import { GcpTransformer } from '@allmaps/transform'

import { parseJsonInput, printString } from '../../lib/io.js'
import { parseTransformOptions } from '../../lib/parse.js'
import { getTransformerFromOptions } from '../../lib/transformer.js'
import {
  addAnnotationOptions,
  addCoordinateTransformOptions
} from '../../lib/options.js'
import { GeojsonGeometry } from '@allmaps/types/geojson.js'

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

    const geojsonGeometries = (await parseJsonInput(files)) as GeojsonGeometry[]
    const geojsonFeatureCollection =
      geojsonGeometriesToGeojsonFeatureCollection(geojsonGeometries)

    const svg = GcpTransformer.transformGeojsonFeatureCollectionToSvgString(
      transformer,
      geojsonFeatureCollection,
      transformOptions
    )

    printString(svg)
  })
}
