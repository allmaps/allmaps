import { Command } from '@commander-js/extra-typings'

import { printGcps } from '@allmaps/io'
import { mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps,
  parseGcpFileTypeOptions,
  parseInternalProjectionInputOptions
} from '../../lib/parse.js'
import { addAnnotationInputOptions } from '../../lib/options.js'

export function gcps() {
  const command = addAnnotationInputOptions(
    new Command('gcps')
      .argument('[files...]')
      .summary('generate GCP files from GCPs')
      .description(
        'Generates GCP files from GCPs of input Georeference Annotations. GCPs are in the internal projection infered from the map or options, with the same default internal projection as in a Projected GCP Transformer used to render maps: "EPSG:3857". Set the internal projection option to "EPSG:4326" to obtain GCPs in lon-lat coordinates.'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const { internalProjection } = parseInternalProjectionInputOptions(options)
    const { gcpFileType } = parseGcpFileTypeOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)

    const gcpStrings = maps.map((map) =>
      printGcps(
        map.gcps,
        mergeOptionsUnlessUndefined(options, {
          internalProjection,
          gcpFileType,
          resourceHeight: map.resource.height
        })
      )
    )
    printString([...gcpStrings].join('\n\n'))
  })
}
