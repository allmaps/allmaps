import { Command } from '@commander-js/extra-typings'

import { viewer } from './open/viewer.ts'

export function open() {
  return new Command('open')
    .summary('open maps in Allmaps Viewer')
    .description(`Open maps in Allmaps Viewer`)
    .addCommand(viewer(), { isDefault: true })
}
