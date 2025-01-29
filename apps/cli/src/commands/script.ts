import { Command } from '@commander-js/extra-typings'

import { dezoomify } from './script/dezoomify.js'
import { geotiff } from './script/geotiff.js'

export function script() {
  return new Command('script')
    .summary('generate Bash scripts')
    .description('Generates Bash scripts')
    .addCommand(dezoomify())
    .addCommand(geotiff())
}
