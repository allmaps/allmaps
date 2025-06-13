import { Command } from '@commander-js/extra-typings'

import { AttachedTransformation } from '@allmaps/attach'

import { parseJsonInput, printJson } from '../lib/io.js'
import {
  parseAnnotationsValidateMaps,
  parseAttachInputs
} from '../lib/parse.js'
import { addAttachOptions } from '../lib/options.js'
import { generateAnnotation } from '@allmaps/annotation'

export function attach() {
  const command = addAttachOptions(
    new Command('attach')
      .argument('[files...]')
      .summary('attaches Georeference Annotations')
      .description(
        'Parses Georeference Annotations and attaches them using attachments, solves the attached transformation jointly and outputs the Georeferenced Annotations with additional GCPs.'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const georeferencedMaps = parseAnnotationsValidateMaps(jsonValues)
    const parsedAttachInputs = parseAttachInputs(options)
    const { rcps } = parsedAttachInputs

    const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
      georeferencedMaps,
      rcps,
      parsedAttachInputs
    )

    const resultingGeoreferencedMaps =
      attachedtransformation.toGeoreferencedMaps()
    const resultingAnnotationPage = generateAnnotation(
      resultingGeoreferencedMaps
    )

    printJson(resultingAnnotationPage)
  })
}
