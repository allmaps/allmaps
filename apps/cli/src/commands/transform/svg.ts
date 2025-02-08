import { Command } from '@commander-js/extra-typings'

import { mergeGeojsonFeaturesCollections } from '@allmaps/stdlib'
import { GcpTransformer } from '@allmaps/transform'

import { readInput, printJson } from '../../lib/io.js'
import {
  parseTransformerInputs,
  parseTransformOptions
} from '../../lib/parse.js'
import { addAnnotationOptions, addTransformOptions } from '../../lib/options.js'

import type { GeojsonFeatureCollection } from '@allmaps/types'

export function svg() {
  const command = addTransformOptions(
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
    const { gcps, transformationType } = parseTransformerInputs(options)
    const partialTransformOptions = parseTransformOptions(options)

    const transformer = new GcpTransformer(
      gcps,
      transformationType,
      partialTransformOptions
    )

    const svgs = await readInput(files)

    const geojsonFeatureCollections: GeojsonFeatureCollection[] = []
    for (const svg of svgs) {
      geojsonFeatureCollections.push(
        GcpTransformer.transformSvgStringToGeojsonFeatureCollection(
          transformer,
          svg
        )
      )
    }
    const geojsonFeatureCollection = mergeGeojsonFeaturesCollections(
      geojsonFeatureCollections
    )
    printJson(geojsonFeatureCollection)
  })
}
