import { Command } from '@commander-js/extra-typings'

import { parse } from './iiif/parse.ts'
import { manifest } from './iiif/manifest.ts'
import { imageIds } from './iiif/image-ids.ts'

export function iiif() {
  return new Command('iiif')
    .summary('parse and generate IIIF resources')
    .description(`Parses and generates IIIF resources`)
    .addCommand(parse())
    .addCommand(manifest())
    .addCommand(imageIds())
}
