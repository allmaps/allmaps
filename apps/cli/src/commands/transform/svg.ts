import { Command } from '@commander-js/extra-typings'

import {
  mergeGeojsonFeaturesCollections,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'
import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'

import { readInput, printJson } from '../../lib/io.js'
import {
  mustContainGcpsMessage,
  parseProjectedGcpTransformerInputOptions,
  parseProjectedGcpTransformerOptions,
  parseProjectedGcpTransformOptions
} from '../../lib/parse.js'
import {
  addAnnotationOptions,
  addProjectedGcpTransformerOptions,
  addProjectedGcpTransformOptions
} from '../../lib/options.js'

import type { GeojsonFeatureCollection } from '@allmaps/types'

export function svg() {
  const command = addProjectedGcpTransformerOptions(
    addProjectedGcpTransformOptions(
      addAnnotationOptions(
        new Command('svg')
          .argument('[files...]')
          .summary('transform SVG to GeoJSON')
          .description(
            'Transform SVG to GeoJSON using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation.'
          )
      )
    )
  )

  return command.action(async (files, options) => {
    const projectedGcpTransformerInputOptions =
      parseProjectedGcpTransformerInputOptions(options)
    const { gcps, transformationType, internalProjection } =
      projectedGcpTransformerInputOptions
    let { projection } = projectedGcpTransformerInputOptions
    const partialProjectedGcpTransformerOptions =
      parseProjectedGcpTransformerOptions(options)
    const partialProjectedGcpTransformOptions =
      parseProjectedGcpTransformOptions(options)

    if (gcps === undefined) {
      throw new Error(mustContainGcpsMessage)
    }
    if (projection === undefined) {
      projection = lonLatProjection
    }

    const projectedTransformer = new ProjectedGcpTransformer(
      gcps,
      transformationType,
      mergeOptionsUnlessUndefined(
        mergePartialOptions(
          partialProjectedGcpTransformerOptions,
          partialProjectedGcpTransformOptions
        ),
        { internalProjection, projection }
      )
    )

    const svgs = await readInput(files)

    const geojsonFeatureCollections: GeojsonFeatureCollection[] = []
    for (const svg of svgs) {
      geojsonFeatureCollections.push(
        ProjectedGcpTransformer.transformSvgStringToGeojsonFeatureCollection(
          projectedTransformer,
          svg
        )
      )
    }
    const geojsonFeatureCollection = mergeGeojsonFeaturesCollections(
      geojsonFeatureCollections
    )
    printJson(geojsonFeatureCollection)
  })
}
