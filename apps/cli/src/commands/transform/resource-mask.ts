import { Command } from 'commander'

import { GCPTransformer } from '@allmaps/transform'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import {
  addTransformOptions,
  parseTransformOptions
} from '../../lib/options.js'

export default function resourceMask() {
  const command = new Command('resource-mask')
    .argument('[files...]')
    .summary('transform resource masks to GeoJSON')
    .description(
      'Transforms resource masks of input Georeference Annotations to GeoJSON'
    )

  return addTransformOptions(command).action(async (files, options) => {
    const jsonValues = await parseJsonInput(files as string[])
    const maps = parseAnnotationsValidateMaps(jsonValues)

    const features = []

    const transformOptions = parseTransformOptions(options)

    for (const map of maps) {
      if (map.gcps.length >= 3) {
        const transformer = new GCPTransformer(
          map.gcps,
          map.transformation?.type
        )
        const polygon = transformer.toGeoJSONPolygon(
          map.resourceMask,
          transformOptions
        )

        features.push({
          type: 'Feature',
          properties: {
            imageId: map.resource.id
          },
          geometry: polygon
        })
      } else {
        console.error(
          'Encountered Georeference Annotation with less than 3 points'
        )
      }
    }

    const featureCollection = {
      type: 'FeatureCollection',
      features
    }

    printJson(featureCollection)
  })
}
