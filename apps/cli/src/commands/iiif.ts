import { Command } from 'commander'

import parse from './iiif/parse.js'
import manifest from './iiif/manifest.js'

export default function iiif() {
  return new Command('iiif')
    .summary('parse and generate IIIF resources')
    .description(`Parses and generates IIIF resources`)
    .addCommand(parse())
    .addCommand(manifest())
}
