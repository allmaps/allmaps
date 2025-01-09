import { Command } from '@commander-js/extra-typings'

import parse from './iiif/parse.js'
import manifest from './iiif/manifest.js'
import imageIds from './iiif/image-ids.js'

export default function iiif() {
  return new Command('iiif')
    .summary('parse and generate IIIF resources')
    .description(`Parses and generates IIIF resources`)
    .addCommand(parse())
    .addCommand(manifest())
    .addCommand(imageIds())
}
