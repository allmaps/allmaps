import { Command } from 'commander'

import { createTransformer } from '@allmaps/transform'

import { parseJsonFromFile, readInput, printJson } from '../../lib/io.js'
import { parseAnnotationValidateMap } from '../../lib/parse.js'
import {
  addAnnotationOption,
  addTransformOptions,
  parseTransformOptions
} from '../../lib/options.js'
import { geomEach } from '../../lib/svg.js'
import {
  transformSvgToGeoJson,
  createFeatureCollection
} from '../../lib/geojson.js'

export default function svg() {
  let command = new Command('svg')
    .argument('[files...]')
    .summary('transform SVG to GeoJSON')
    .description('Transforms SVG to GeoJSON using a Georeference Annotation')

  command = addAnnotationOption(command)

  return addTransformOptions(command).action(async (files, options) => {
    const annotation = parseJsonFromFile(options.annotation as string)
    const mapOrMaps = parseAnnotationValidateMap(annotation)

    if (Array.isArray(mapOrMaps) && mapOrMaps.length > 1) {
      throw new Error('Annotation must contain exactly 1 georeferenced map')
    }

    const transformOptions = parseTransformOptions(options)

    const map = Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
    const transformer = createTransformer(map.gcps)

    const svgs = await readInput(files as string[])

    let geoJsonGeometries = []
    for (let svg of svgs) {
      for (let geometry of geomEach(svg)) {
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
