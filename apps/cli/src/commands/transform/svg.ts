import { Command } from 'commander'

import { GCPTransformer } from '@allmaps/transform'

import { readInput, printJson } from '../../lib/io.js'
import {
  parseGcps,
  parseMap,
  parseTransformOptions,
  parseTransformationType
} from '../../lib/parse.js'
import { addAnnotationOptions, addTransformOptions } from '../../lib/options.js'
import { geomEach } from '../../lib/svg.js'
import {
  transformSvgToGeoJson,
  createFeatureCollection
} from '../../lib/geojson.js'

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

    const transformer = new GCPTransformer(gcps, transformationType)

    const svgs = await readInput(files as string[])

    const geoJsonGeometries = []
    for (const svg of svgs) {
      for (const geometry of geomEach(svg)) {
        const geoJsonGeometry = transformSvgToGeoJson(
          transformer,
          geometry,
          transformOptions
        )
        geoJsonGeometries.push(geoJsonGeometry)
      }
    }

    const featureCollection = createFeatureCollection(geoJsonGeometries)
    printJson(featureCollection)
  })
}
