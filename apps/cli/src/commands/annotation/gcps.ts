import { Command } from '@commander-js/extra-typings'

import { printGeoreferencedMapGcps } from '@allmaps/io'

import { parseJsonInput, printString } from '../../lib/io.js'
import {
  parseAnnotationInputOptions,
  parseAnnotationsValidateMaps
} from '../../lib/parse.js'
import { addAnnotationInputOptions } from '../../lib/options.js'
import { mergeOptions } from '@allmaps/stdlib'

export function gcps() {
  const command = addAnnotationInputOptions(
    new Command('gcps')
      .argument('[files...]')
      .summary('generate GCP files from GCPs')
      .description(
        'Generates GCP files from GCPs of input Georeference Annotations. GCPs are expected in "EPSG:4326" by default, but their projection can be specified in a QGIS GCP file format or via the options.'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const annotationInputs = parseAnnotationInputOptions(options)
    const maps = parseAnnotationsValidateMaps(jsonValues, annotationInputs)

    const gcpStrings = maps.map((map) =>
      printGeoreferencedMapGcps(map, mergeOptions(options, annotationInputs))
    )
    printString([...gcpStrings].join('\n\n'))
  })
}
