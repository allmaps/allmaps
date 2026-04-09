import { Command } from '@commander-js/extra-typings'

import { Analyzer } from '@allmaps/analyze'

import { parseJsonInput, printAnalysisItem } from '../../lib/io.js'
import { addAnalyzeInputs } from '../../lib/options.js'
import {
  parseAnnotationsValidateMaps,
  parseAnalyzeInputs
} from '../../lib/parse.js'

export function warnings() {
  const command = addAnalyzeInputs(
    new Command('warnings')
      .argument('[files...]')
      .summary('analyze warnings of maps')
      .description('Analyzes input maps and returns warning items.')
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const georeferencedMaps = parseAnnotationsValidateMaps(jsonValues)
    const parsedAnalyzeInputs = parseAnalyzeInputs(options)

    georeferencedMaps.forEach((georeferencedMap, index) => {
      const analyzer = new Analyzer(georeferencedMap, parsedAnalyzeInputs)

      analyzer.getWarnings().forEach((item) => {
        printAnalysisItem(item, 'Map ' + index)
      })
    })
  })
}
