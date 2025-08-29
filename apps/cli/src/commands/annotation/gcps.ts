import { Command } from '@commander-js/extra-typings'

import { printGeoreferencedMapGcps } from '@allmaps/io'

import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps,
  parseGcpFileFormatOptions
} from '../../lib/parse.js'
import { addAnnotationInputOptions } from '../../lib/options.js'

export function gcps() {
  const command = addAnnotationInputOptions(
    new Command('gcps')
      .argument('[files...]')
      .summary('generate GCP files from GCPs')
      .description(
        'Generates GCP files from GCPs of input Georeference Annotations. GCPs are in the internal projection inferred from the map or options, with the same default internal projection as in a Projected GCP Transformer used to render maps: "EPSG:3857". Set the internal projection option to "EPSG:4326" to obtain GCPs in lon-lat coordinates.'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)
    const { gcpFileFormat } = parseGcpFileFormatOptions(options)

    const gcpStrings = maps.map((map) =>
      printGeoreferencedMapGcps(map, { gcpFileFormat })
    )
    printString([...gcpStrings].join('\n\n'))
  })
}
