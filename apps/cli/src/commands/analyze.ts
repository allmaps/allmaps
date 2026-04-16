import { Command } from '@commander-js/extra-typings'

import { info } from './analyze/info.js'
import { warnings } from './analyze/warnings.js'
import { errors } from './analyze/errors.js'
import { all } from './analyze/all.js'

export function analyze() {
  return new Command('analyze')
    .summary('analyze maps')
    .description(
      `Analyzes input maps and returns information, warning and error items:

- Info are notable but not problematic informations on a warping.
- Warnings are possibly problematic findings, but don't invalidate the map.
- Errors are problematic findings that invalidate the map.`
    )
    .addCommand(info())
    .addCommand(warnings())
    .addCommand(errors())
    .addCommand(all(), { isDefault: true })
}
