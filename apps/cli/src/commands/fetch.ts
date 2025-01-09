import { Command } from '@commander-js/extra-typings'

import fullImage from './fetch/full-image.js'

export default function iiif() {
  return new Command('fetch')
    .summary('fetches IIIF images')
    .description(`Fetches IIIF images`)
    .addCommand(fullImage())
}
