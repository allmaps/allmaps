import { Command } from '@commander-js/extra-typings'

import { parse } from './annotation/parse.js'
import { generate } from './annotation/generate.js'
import { svg } from './annotation/svg.js'
import { imageIds } from './annotation/image-ids.js'
import { gcps } from './annotation/gcps.js'

export function annotation() {
  return new Command('annotation')
    .summary('parse and generate Georeference Annotations')
    .description(`Parses and generates Georeference Annotations`)
    .addCommand(parse())
    .addCommand(generate())
    .addCommand(svg())
    .addCommand(imageIds())
    .addCommand(gcps())
}
