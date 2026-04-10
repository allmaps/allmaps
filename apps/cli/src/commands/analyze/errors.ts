import { Command } from '@commander-js/extra-typings'

import { Analyzer } from '@allmaps/analyze'

import { parseJsonInput, printAnalysisItem } from '../../lib/io.js'
import { addAnalyzeInputs } from '../../lib/options.js'
import {
  parseAnnotationsValidateMaps,
  parseAnalyzeInputs
} from '../../lib/parse.js'

export function errors() {
  const command = addAnalyzeInputs(
    new Command('errors')
      .argument('[files...]')
      .summary('analyze errors of maps')
      .description('Analyzes input maps and returns error items.')
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const georeferencedMaps = parseAnnotationsValidateMaps(jsonValues)
    const parsedAnalyzeInputs = parseAnalyzeInputs(options)

    georeferencedMaps.forEach((georeferencedMap, mapIndex) => {
      const analyzer = new Analyzer(georeferencedMap, parsedAnalyzeInputs)

      analyzer.getErrors().forEach((item) => {
        printAnalysisItem(item, mapIndex)
      })
    })
  })
}
