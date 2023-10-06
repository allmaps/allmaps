import { Command } from 'commander'

import { GcpTransformer } from '@allmaps/transform'

import { readInput, printString, readFromStdinLine } from '../../lib/io.js'
import {
  parseMap,
  parseGcps,
  parseCoordinatesArrayArray,
  parseTransformationType
} from '../../lib/parse.js'
import { addAnnotationOptions } from '../../lib/options.js'

import type { Position } from '@allmaps/types'

export default function coordinates() {
  let command = new Command('coordinates')
    .argument('[files...]')
    .summary('transform coordinates forwards (or backwards)')
    .description(
      `Transforms coordinates from input files forward or backward using a transformation built from the GCPs and transformation type specified in a Georeference Annotation.

Coordinates files are expected to contain one coordinate (x, y) on each line, separated by a space, e.g.:

4.8787 3.78792

GCP files are similar, they contain two coordinates (sourceX, sourceY) (destinationX, destinationY) on each line, separated by a spaces, e.g.:

4.8787 3.78792 500 600

Input filenames can be supplied as arguments or piped to the standard input. If no input is given you will be prompted to enter coordinates manually.
This command was inspired by gdaltransform.`
    )

  command = addAnnotationOptions(command)

  return command.action(async (files, options) => {
    const map = parseMap(options)
    const gcps = parseGcps(options, map)
    const transformationType = parseTransformationType(options, map)

    const transformer = new GcpTransformer(gcps, transformationType)

    const positionStrings = await readInput(files as string[])

    if (positionStrings.length) {
      for (const positionString of positionStrings) {
        processPositionString(positionString, transformer, options)
      }
    } else {
      printString('Enter X and Y values separated by space, and press Return.')
      let positionString = await readFromStdinLine()
      while (positionString) {
        processPositionString(positionString, transformer, options)
        printString('')
        positionString = await readFromStdinLine()
      }
    }
  })
}

function processPositionString(
  positionString: string,
  transformer: GcpTransformer,
  options: { inverse: boolean }
) {
  // Parse positionString to array of positions and transform them
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
    printString(outputPosition[0] + ' ' + outputPosition[1])
  )
}
