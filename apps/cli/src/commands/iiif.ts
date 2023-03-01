import type { ArgumentsCamelCase } from 'yargs'

import parse from './iiif/parse.js'
import manifest from './iiif/manifest.js'

const command = 'iiif <command> [file...]'

const describe = 'Parses and generates IIIF data'

function builder(yargs: any) {
  return yargs.command(parse).command(manifest).demandCommand(1, '')
}

async function handler(argv: ArgumentsCamelCase) {}

export default {
  command,
  describe,
  builder,
  handler
}
