import { Command } from 'commander'

import { GcpTransformer } from '@allmaps/transform'

import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseGcps,
  parseMap,
  parseTransformOptions,
  parseTransformationType
} from '../../lib/parse.js'
import { addAnnotationOptions, addTransformOptions } from '../../lib/options.js'
import { isGeojsonGeometry, svgGeometriesToSvgString } from '@allmaps/stdlib'

export default function geojson() {
  let command = new Command('geojson')
    .argument('[files...]')
    .summary('transform GeoJSON to SVG')
    .description(
      'Transform GeoJSON to SVG using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.'
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

    const geojsonGeometries = await parseJsonInput(files as string[])

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
