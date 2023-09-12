import { Command } from 'commander'

import { GCPTransformer } from '@allmaps/transform'

import { readInput, print, readFromStdinLine } from '../../lib/io.js'
import {
  parseCoordinatesArrayArray,
  parseGcps,
  parseMap,
  parseTransformationType
} from '../../lib/parse.js'

import type { Position } from '@allmaps/types'
import { addAnnotationOptions } from '../../lib/options.js'

export default function position() {
  let command = new Command('position')
    .argument('[files...]')
    .summary('transform positions forwards (or backwards)')
    .description(
      'Transform positions from input files forward (or backward) using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.\n\n' +
        'Position-files are expected to contain one position on each line, formatted as pairs of coordinates in decimal form separated by spaces. E.g.: X_origin Y_origin\n' +
        'GCP-files are similar: X_origin Y_origin X_destination Y_destination\n\n' +
        'Inputs can be supplied at the end of the command or piped to stdin. If no input is given a promt will show up in stdin.\n' +
        'Output can be stored by redirecting stdout using: allmaps transform position ... > SomeFile.txt\n\n' +
        'This command was inspired by gdaltransform.'
    )

  command = addAnnotationOptions(command)

  return command.action(async (files, options) => {
    const map = parseMap(options)
    const gcps = parseGcps(options, map)
    const transformationType = parseTransformationType(options, map)

    const transformer = new GCPTransformer(gcps, transformationType)

    const positionStrings = await readInput(files as string[])

    if (positionStrings.length) {
      for (const positionString of positionStrings) {
        processPositionString(positionString, transformer, options)
      }
    } else {
      print('Enter X Y values separated by space, and press Return.')
      let positionString = await readFromStdinLine()
      while (positionString) {
        processPositionString(positionString, transformer, options)
        print('')
        positionString = await readFromStdinLine()
      }
    }
  })
}

function processPositionString(
  positionString: string,
  transformer: GCPTransformer,
  options: { inverse: string }
) {
  // Parse positionString to Array of positions and transform them
  const outputPositions: Position[] = []
  const positionArray = parseCoordinatesArrayArray(positionString) as Position[]
  positionArray.forEach((position) =>
    outputPositions.push(
      options.inverse
        ? transformer.transformToResource(position as Position)
        : transformer.transformToGeo(position as Position)
    )
  )

  // Print transformed positions
  outputPositions.forEach((outputPosition) =>
    print(outputPosition[0] + ' ' + outputPosition[1])
  )
}
