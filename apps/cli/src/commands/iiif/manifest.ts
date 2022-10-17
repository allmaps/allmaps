import { IIIF, Image } from '@allmaps/iiif-parser'

import { parseJsonInput, printJson } from '../../lib/io.js'
import { generateManifest } from '../../lib/iiif.js'
import { getIssues, formatIssue } from '../../lib/errors.js'

import type { ArgumentsCamelCase } from 'yargs'

import type { ZodError } from 'zod'

const command = 'manifest [file...]'

const describe = 'Parses and generates IIIF data'

const builder = {
  // format: {
  //   alias: 'f',
  //   choices: ['parse', 'manifest'],
  //   default: 'parse',
  //   description: 'Choose output format'
  // }
  // version
  // uri
}

async function handler(argv: ArgumentsCamelCase) {
  const jsonValues = await parseJsonInput(argv.file as string[])

  let parsedImages = []

  const parsedIiif = jsonValues.map((jsonValue) => IIIF.parse(jsonValue))
  for (let p of parsedIiif) {
    if (p instanceof Image) {
      parsedImages.push(p)
    } else {
      parsedImages.push(...p.canvases.map((c) => c.image))
    }
  }

  const uri = 'https://allmaps.org/dighimapper/manifests/batch1.json'

  const manifest = generateManifest(uri, parsedImages)
  printJson(manifest)
}

export default {
  command,
  describe,
  builder,
  handler
}
