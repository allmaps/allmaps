import { Command } from '@commander-js/extra-typings'

import { mergeGeojsonFeaturesCollections } from '@allmaps/stdlib'
import { GcpTransformer } from '@allmaps/transform'

import { readInput, printJson } from '../../lib/io.js'
import { parseTransformOptions } from '../../lib/parse.js'
import { getTransformerFromOptions } from '../../lib/transformer.js'
import {
  addAnnotationOptions,
  addCoordinateTransformOptions
} from '../../lib/options.js'

import type { GeojsonFeatureCollection } from '@allmaps/types'

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

    const geojsonFeatureCollections: GeojsonFeatureCollection[] = []
    for (const svg of svgs) {
      geojsonFeatureCollections.push(
        GcpTransformer.transformSvgStringToGeojsonFeatureCollection(
          transformer,
          svg,
          transformOptions
        )
      )
    }
    const geojsonFeatureCollection = mergeGeojsonFeaturesCollections(
      geojsonFeatureCollections
    )
    printJson(geojsonFeatureCollection)
  })
}
