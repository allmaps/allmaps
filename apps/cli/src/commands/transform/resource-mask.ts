import { Command } from '@commander-js/extra-typings'

import { GcpTransformer } from '@allmaps/transform'
import {
  geojsonFeaturesToGeojsonFeatureCollection,
  geojsonGeometryToGeojsonFeature,
  geometryToGeojsonGeometry
} from '@allmaps/stdlib'

import { parseJsonInput, printJson } from '../../lib/io.js'
import {
  parseAnnotationsValidateMaps,
  parseGcps,
  parseTransformationType,
  parseTransformOptions
} from '../../lib/parse.js'
import { addTransformOptions } from '../../lib/options.js'

export function resourceMask() {
  const command = addTransformOptions(
    new Command('resource-mask')
      .argument('[files...]')
      .summary('transform resource masks to GeoJSON')
      .description(
        'Transform SVG resource masks of input Georeference Annotations to GeoJSON using a transformation built from the GCPs and transformation type specified in a Georeference Annotation itself.\n' +
          "This is a faster alternative for 'transform svg' where the resource mask from the Georeference Annotation specified in the arguments is also the input SVG."
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const maps = parseAnnotationsValidateMaps(jsonValues)
    const partialTransformOptions = parseTransformOptions(options)

    const features = []
    for (const map of maps) {
      // Note: adding "&& {}" to make typescript happy
      const gcps = parseGcps(options && {}, map)
      const transformationType = parseTransformationType(options && {}, map)

      const transformer = new GcpTransformer(
        gcps,
        transformationType,
        partialTransformOptions
      )
      const polygon = transformer.transformToGeo([map.resourceMask])
      const geojsonPolygon = geometryToGeojsonGeometry(polygon)

      features.push(
        geojsonGeometryToGeojsonFeature(geojsonPolygon, {
          imageId: map.resource.id
        })
      )
    }

    const featureCollection =
      geojsonFeaturesToGeojsonFeatureCollection(features)
    printJson(featureCollection)
  })
}
