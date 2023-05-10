import { Command } from 'commander'

import { GCPTransformer } from '@allmaps/transform'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import {
  addTransformOptions,
  parseTransformOptions
} from '../../lib/options.js'

export default function pixelMask() {
  const command = new Command('pixel-mask')
    .argument('[files...]')
    .summary('transform pixel masks to GeoJSON')
    .description(
      'Transforms pixel masks of input Georeference Annotations to GeoJSON'
    )

  return addTransformOptions(command).action(async (files, options) => {
    const jsonValues = await parseJsonInput(files as string[])
    const maps = parseAnnotationsValidateMaps(jsonValues)

    let features = []

    const transformOptions = parseTransformOptions(options)

    for (let map of maps) {
      if (map.gcps.length >= 3) {
        const transformer = new GCPTransformer(map.gcps)
        const polygon = transformer.toGeoJSONPolygon(
          map.pixelMask,
          transformOptions
        )

        features.push({
          type: 'Feature',
          properties: {
            imageUri: map.image.uri
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
