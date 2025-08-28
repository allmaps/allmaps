import { Command } from '@commander-js/extra-typings'

import { printGcps } from '@allmaps/io'
import { mergeOptions } from '@allmaps/stdlib'

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
        'Generates GCP files from GCPs of input Georeference Annotations. GCPs are printed in the internal projection infered from the map or options, with "EPSG:3857" as default for optimal rendering. Set the internal projection option to "EPSG:4326" to obtain GCPs in lon-lat coordinates.'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const { internalProjection } = parseInternalProjectionInputOptions(options)
    const { gcpFileType } = parseGcpFileTypeOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)

    const gcps = maps.map((map) => map.gcps)
    const gcpStrings = gcps.map((gcps) =>
      printGcps(
        gcps,
        mergeOptions(options, { internalProjection, gcpFileType })
      )
    )
    printString([...gcpStrings].join('\n\n'))
  })
}
