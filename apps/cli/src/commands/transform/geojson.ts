import { Command } from '@commander-js/extra-typings'

import { geojsonGeometriesToGeojsonFeatureCollection } from '@allmaps/stdlib'
import { GcpTransformer } from '@allmaps/transform'

import { parseJsonInput, printString } from '../../lib/io.js'
import { addAnnotationOptions, addTransformOptions } from '../../lib/options.js'
import {
  parseTransformerInputs,
  parseTransformOptions
} from '../../lib/parse.js'

import type { GeojsonGeometry } from '@allmaps/types/geojson.js'

export function geojson() {
  const command = addTransformOptions(
    addAnnotationOptions(
      new Command('geojson')
        .argument('[files...]')
        .summary('transform GeoJSON to SVG')
        .description(
          'Transform GeoJSON to SVG using a GCP Transformer and its transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.'
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

    const geojsonGeometries = (await parseJsonInput(files)) as GeojsonGeometry[]
    const geojsonFeatureCollection =
      geojsonGeometriesToGeojsonFeatureCollection(geojsonGeometries)

    const svg = GcpTransformer.transformGeojsonFeatureCollectionToSvgString(
      transformer,
      geojsonFeatureCollection
    )

    printString(svg)
  })
}
