import { Command } from '@commander-js/extra-typings'

import { viewer } from './launch/viewer.js'

export function launch() {
  return new Command('launch')
    .summary('launch maps in Allmaps Viewer or other tools')
    .description(`Launch maps in Allmaps Viewer or other tools`)
    .addCommand(viewer(), { isDefault: true })
}
