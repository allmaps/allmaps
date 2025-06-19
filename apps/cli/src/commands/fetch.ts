import { Command } from '@commander-js/extra-typings'

import { fullImage } from './fetch/full-image.js'

export function fetch() {
  return new Command('fetch')
    .summary('fetche IIIF images')
    .description(`Fetche IIIF images`)
    .addCommand(fullImage())
}
