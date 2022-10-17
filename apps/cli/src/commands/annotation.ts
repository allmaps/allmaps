import type { ArgumentsCamelCase } from 'yargs'

import parse from './annotation/parse.js'
import generate from './annotation/generate.js'
import svg from './annotation/svg.js'

const command = 'annotation <command> [file...]'

const describe = 'Parses and generates Georef Annotations'

function builder(yargs: any) {
  return yargs
    .command(parse)
    .command(generate)
    .command(svg)
    .demandCommand(1, '')
}

async function handler(argv: ArgumentsCamelCase) {}

export default {
  command,
  describe,
  builder,
  handler
}
