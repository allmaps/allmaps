import { Command } from '@commander-js/extra-typings'

import { parse } from './annotation/parse.ts'
import { generate } from './annotation/generate.ts'
import { svg } from './annotation/svg.ts'
import { imageIds } from './annotation/image-ids.ts'
import { gcps } from './annotation/gcps.ts'

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
