import { Command } from '@commander-js/extra-typings'

import { ProjectedGcpTransformer } from '@allmaps/project'
import {
  mergeOptionsUnlessUndefined,
  mergePartialOptions,
  parseCoordinates
} from '@allmaps/stdlib'

import { readInput, printString, readFromStdinLine } from '../../lib/io.js'
import {
  parseProjectedGcpTransformerInputOptions,
  parseProjectedGcpTransformerOptions,
  parseProjectedGcpTransformOptions,
  parseInverseOptions,
  mustContainGcpsMessage
} from '../../lib/parse.js'
import {
  addAnnotationOptions,
  addProjectedGcpTransformOptions,
  addInverseOptions,
  addProjectedGcpTransformerOptions
} from '../../lib/options.js'

import type { Point } from '@allmaps/types'
import type { InverseOptions } from '@allmaps/transform'

export function coordinates() {
  const command = addInverseOptions(
    addProjectedGcpTransformerOptions(
      addProjectedGcpTransformOptions(
        addAnnotationOptions(
          new Command('coordinates')
            .argument('[files...]')
            .summary("transform coordinates 'toGeo' (or 'toResource')")
            .description(
              `Transforms coordinates from input files 'toGeo' or 'toResource' using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation (or parameters).

Coordinates files are expected to contain one coordinate (x, y) on each line, separated by a space, e.g.:

4.8787 3.78792

GCP files are similar, they contain two coordinates (sourceX, sourceY) (destinationX, destinationY) on each line, separated by a spaces, e.g.:

4.8787 3.78792 500 600

Input filenames can be supplied as arguments or piped to the standard input. If no input is given you will be prompted to enter coordinates manually.
This command was inspired by gdaltransform.`
            )
        )
      )
    )
  )

  return command.action(async (files, options) => {
    let { gcps, transformationType, internalProjection } =
      parseProjectedGcpTransformerInputOptions(options)
    const partialProjectedGcpTransformerOptions =
      parseProjectedGcpTransformerOptions(options)
    const partialProjectedGcpTransformOptions =
      parseProjectedGcpTransformOptions(options)
    const partialInverseOptions = parseInverseOptions(options)

    if (gcps === undefined) {
      throw new Error(mustContainGcpsMessage)
    }

    const projectedTransformer = new ProjectedGcpTransformer(
      gcps,
      transformationType,
      mergeOptionsUnlessUndefined(
        mergePartialOptions(
          partialProjectedGcpTransformerOptions,
          partialProjectedGcpTransformOptions
        ),
        { internalProjection }
      )
    )

    const pointStrings = await readInput(files)

    if (pointStrings.length) {
      for (const pointString of pointStrings) {
        processPointString(
          pointString,
          projectedTransformer,
          partialInverseOptions
        )
      }
    } else {
      printString('Enter X and Y values separated by space, and press Return.')
      let pointString = await readFromStdinLine()
      while (pointString) {
        processPointString(
          pointString,
          projectedTransformer,
          partialInverseOptions
        )
        printString('')
        pointString = await readFromStdinLine()
      }
    }
  })
}

function processPointString(
  pointString: string,
  projectedTransformer: ProjectedGcpTransformer,
  partialInverseOptions: Partial<InverseOptions>
) {
  // Parse pointString to array of points and transform them
  const outputPoints: Point[] = []
  const pointArray = parseCoordinates(pointString) as Point[]
  pointArray.forEach((point) => {
    outputPoints.push(
      partialInverseOptions.inverse
        ? projectedTransformer.transformToResource(point)
        : projectedTransformer.transformToGeo(point)
    )
  })

  // Print transformed points
  outputPoints.forEach((outputPoint) =>
    printString(outputPoint[0] + ' ' + outputPoint[1])
  )
}
