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

import type { Point } from '@allmaps/types'

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

    const pointStrings = await readInput(files as string[])

    if (pointStrings.length) {
      for (const pointString of pointStrings) {
        processPointString(pointString, transformer, options)
      }
    } else {
      printString('Enter X and Y values separated by space, and press Return.')
      let pointString = await readFromStdinLine()
      while (pointString) {
        processPointString(pointString, transformer, options)
        printString('')
        pointString = await readFromStdinLine()
      }
    }
  })
}

function processPointString(
  pointString: string,
  transformer: GcpTransformer,
  options: { inverse: boolean }
) {
  // Parse pointString to array of points and transform them
  const outputPoints: Point[] = []
  const pointArray = parseCoordinatesArrayArray(pointString) as Point[]
  pointArray.forEach((point) =>
    outputPoints.push(
      options.inverse
        ? transformer.transformToResource(point as Point)
        : transformer.transformToGeo(point as Point)
    )
  )

  // Print transformed points
  outputPoints.forEach((outputPoint) =>
    printString(outputPoint[0] + ' ' + outputPoint[1])
  )
}
