import { Command } from '@commander-js/extra-typings'

import { GcpTransformer } from '@allmaps/transform'

import { parseJsonInput, printJson } from '../../lib/io.js'
import {
  parseAnnotationsValidateMaps,
  parseTransformOptions
} from '../../lib/parse.js'
import { addCoordinateTransformOptions } from '../../lib/options.js'
import { featuresToFeatureCollection, geometryToFeature } from '@allmaps/stdlib'

export function resourceMask() {
  const command = addCoordinateTransformOptions(
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
    const transformOptions = parseTransformOptions(options)

    if (options.inverse) {
      throw new Error('Inverse transformation not supported for this command')
    }

    const features = []
    for (const map of maps) {
      const transformer = new GcpTransformer(map.gcps, map.transformation?.type)
      const polygon = transformer.transformForwardAsGeojson(
        [map.resourceMask],
        transformOptions
      )

      features.push(
        geometryToFeature(polygon, {
          imageId: map.resource.id
        })
      )
    }

    const featureCollection = featuresToFeatureCollection(features)
    printJson(featureCollection)
  })
}
