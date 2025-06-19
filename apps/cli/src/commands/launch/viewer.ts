import open from 'open'
import { Command } from '@commander-js/extra-typings'

import { parseJsonInput } from '../../lib/io.js'
import { addLaunchOptions } from '../../lib/options.js'
import {
  parseAnnotationsValidateMaps,
  parseLaunchInputs
} from '../../lib/parse.js'
import { generateAnnotation } from '@allmaps/annotation'

export function viewer() {
  const command = addLaunchOptions(
    new Command('viewer')
      .argument('[files...]')
      .summary('launch Allmaps Viewer with specified maps')
      .description('Launch Allmaps Viewer with specified maps')
  )

  // TODO: use HTTP-post request instead of url parameter
  // when enabled on Allmaps Viewer to allow for more data

  // TODO: add and pass options when enabled on Allmaps Viewer

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const maps = parseAnnotationsValidateMaps(jsonValues)
    const partialLaunchOptions = parseLaunchInputs(options)

    // TODO: load port from ports.json once loading "with { type: 'json' }" is supported
    // Currently gives error in tests
    const baseUrl = partialLaunchOptions.localhost
      ? 'http://localhost:5500'
      : `https://${partialLaunchOptions.next ? 'next.dev.' : ''}${partialLaunchOptions.dev ? 'dev.' : ''}viewer.allmaps.org`
    const url: string = `${baseUrl}/?data=${encodeURIComponent(JSON.stringify(generateAnnotation(maps)))}`

    open(url)
  })
}
