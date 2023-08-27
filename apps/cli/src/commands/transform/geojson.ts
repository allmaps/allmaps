import { Command } from 'commander'

import { GCPTransformer } from '@allmaps/transform'

import { parseJsonInput, print } from '../../lib/io.js'
import {
  parseGcps,
  parseMap,
  parseTransformOptions,
  parseTransformationType
} from '../../lib/parse.js'
import { addAnnotationOptions, addTransformOptions } from '../../lib/options.js'
import { createSvgString, transformGeoJsonToSvg } from '../../lib/svg.js'
import { isGeoJSONGeometry } from '../../lib/geojson.js'

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

    const transformer = new GCPTransformer(gcps, transformationType)

    const geoJsonGeometries = await parseJsonInput(files as string[])

    const svgElements = []
    for (const geoJsonGeometry of geoJsonGeometries) {
      if (isGeoJSONGeometry(geoJsonGeometry)) {
        const svgElement = transformGeoJsonToSvg(
          transformer,
          geoJsonGeometry,
          transformOptions
        )
        svgElements.push(svgElement)
      } else {
        throw new Error(
          'Unsupported input. Only GeoJSON Points, LineStrings and Polygons are supported.'
        )
      }
    }

    const svg = createSvgString(svgElements)
    print(svg)
  })
}
