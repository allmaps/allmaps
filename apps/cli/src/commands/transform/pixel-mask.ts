import { createTransformer, polygonToWorld } from '@allmaps/transform'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

import type { ArgumentsCamelCase } from 'yargs'

const command = 'pixel-mask [file...]'

const describe =
  'Transforms pixel masks of input Georeference Annotations to GeoJSON'

const builder = {}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonInput(argv.file as string[])
  const maps = parseAnnotationsValidateMaps(jsonValues)

  let features = []

  for (let map of maps) {
    if (map.gcps.length >= 3) {
      const transformer = createTransformer(map.gcps)
      const polygon = polygonToWorld(transformer, map.pixelMask)

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
}

export default {
  command,
  describe,
  builder,
  handler
}
