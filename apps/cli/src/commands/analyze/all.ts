import { Command } from '@commander-js/extra-typings'

import { Analyzer } from '@allmaps/analyze'

import { parseJsonInput, printAnalysisItem } from '../../lib/io.js'
import { addAnalyzeInputs } from '../../lib/options.js'
import {
  parseAnnotationsValidateMaps,
  parseAnalyzeInputs
} from '../../lib/parse.js'

export function all() {
  const command = addAnalyzeInputs(
    new Command('all')
      .argument('[files...]')
      .summary('analyze infos, warnings and errors of maps')
      .description(
        'Analyzes input maps and returns information, warning and error items.'
      )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const georeferencedMaps = parseAnnotationsValidateMaps(jsonValues)
    const parsedAnalyzeInputs = parseAnalyzeInputs(options)

    georeferencedMaps.forEach((georeferencedMap, index) => {
      const analyzer = new Analyzer(georeferencedMap, parsedAnalyzeInputs)

      const analysis = analyzer.analyze()
      analysis.info.forEach((item) => {
        printAnalysisItem(item, 'Map ' + index)
      })
      analysis.warnings.forEach((item) => {
        printAnalysisItem(item, 'Map ' + index)
      })
      analysis.errors.forEach((item) => {
        printAnalysisItem(item, 'Map ' + index)
      })
    })
  })
}
