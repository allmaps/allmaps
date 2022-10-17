import { generateAnnotation } from '@allmaps/annotation'

import { parseJsonFromStdin, printJson } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'

import type { ArgumentsCamelCase } from 'yargs'

const command = 'geojson -a <annotation> [file...]'

const describe = "Transforms GeoJSON to SVG"

const builder = {
  annotation: {
    alias: 'a',
    description: 'Filename of Georeference Annotation',
    demandOption: true
  }
}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonFromStdin()

  // geomEach
}

export default {
  command,
  describe,
  builder,
  handler
}



//   } else if (argv.format === 'geojson') {
//     const maps = jsonValues.map(parseAnnotation).flat()

//     let features = []

//     for (let map of maps) {
//       const transformer = createTransformer(map.gcps)
//       const polygon = polygonToWorld(transformer, map.pixelMask)

//       features.push({
//         type: 'Feature',
//         properties: map,
//         geometry: polygon
//       })
//     }

//     let featureCollection = {
//       type: 'FeatureCollection',
//       features
//     }

//     printJson(featureCollection)
//   } else if (argv.format === 'svg') {
//     console.log('svg')
//   }
