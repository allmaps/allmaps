import { Command } from 'commander'

import { GcpTransformer } from '@allmaps/transform'

import { readInput, printJson } from '../../lib/io.js'
import {
  parseGcps,
  parseMap,
  parseTransformOptions,
  parseTransformationType
} from '../../lib/parse.js'
import { addAnnotationOptions, addTransformOptions } from '../../lib/options.js'
import {
  stringToSvgGeometriesGenerator,
  geometriesToFeatureCollection
} from '@allmaps/stdlib'

export default function svg() {
  let command = new Command('svg')
    .argument('[files...]')
    .summary('transform SVG to GeoJSON')
    .description(
      'Transform SVG to GeoJSON using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.'
    )

  command = addAnnotationOptions(command)
  command = addTransformOptions(command)

  return command.action(async (files, options) => {
    const map = parseMap(options)
    const gcps = parseGcps(options, map)
    const transformationType = parseTransformationType(options, map)
    const transformOptions = parseTransformOptions(options)

    const transformer = new GcpTransformer(gcps, transformationType)

    if (options.inverse) {
      throw new Error('Inverse transformation not supported for this command')
    }

    const svgs = await readInput(files as string[])

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
