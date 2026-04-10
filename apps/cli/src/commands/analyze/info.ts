import { Command } from '@commander-js/extra-typings'

import { Analyzer } from '@allmaps/analyze'

import { parseJsonInput, printAnalysisItem } from '../../lib/io.js'
import { addAnalyzeInputs } from '../../lib/options.js'
import {
  parseAnnotationsValidateMaps,
  parseAnalyzeInputs
} from '../../lib/parse.js'

export function info() {
  const command = addAnalyzeInputs(
    new Command('info')
      .argument('[files...]')
      .summary('analyze infos of maps')
      .description('Analyzes input maps and returns information items.')
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const georeferencedMaps = parseAnnotationsValidateMaps(jsonValues)
    const parsedAnalyzeInputs = parseAnalyzeInputs(options)

    georeferencedMaps.forEach((georeferencedMap, mapIndex) => {
      const analyzer = new Analyzer(georeferencedMap, parsedAnalyzeInputs)

      analyzer.getInfo().forEach((item) => {
        printAnalysisItem(item, mapIndex)
      })
    })
  })
}
