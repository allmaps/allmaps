import open from 'open'
import { Command } from '@commander-js/extra-typings'

import { parseJsonInput } from '../../lib/io.js'
import { parseAnnotationsValidateMaps } from '../../lib/parse.js'
import { generateAnnotation } from '@allmaps/annotation'

export function viewer() {
  const command = new Command('viewer')
    .argument('[files...]')
    .summary('open Allmaps Viewer with specified maps')
    .description('Open Allmaps Viewer with specified maps')

  // TODO: use HTTP-post request instead of url parameter
  // when enabled on Allmaps Viewer to allow for more data

  // TODO: add and pass render options when enabled on Allmaps Viewer

  return command.action(async (files) => {
    const jsonValues = await parseJsonInput(files)
    const maps = parseAnnotationsValidateMaps(jsonValues)

    const url: string = `https://viewer.allmaps.org/?data=${encodeURIComponent(JSON.stringify(generateAnnotation(maps)))}`

    open(url)
  })
}
