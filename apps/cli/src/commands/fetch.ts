import { Command } from '@commander-js/extra-typings'

import { fullImage } from './fetch/full-image.js'

export function fetch() {
  return new Command('fetch')
    .summary('fetch IIIF images')
    .description(`Fetch IIIF images`)
    .addCommand(fullImage())
}
