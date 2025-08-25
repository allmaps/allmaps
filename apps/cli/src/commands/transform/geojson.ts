import { Command } from '@commander-js/extra-typings'

import {
  geojsonGeometriesToGeojsonFeatureCollection,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'
import { ProjectedGcpTransformer } from '@allmaps/project'

import { parseJsonInput, printString } from '../../lib/io.js'
import {
  addAnnotationOptions,
  addProjectedGcpTransformerOptions,
  addProjectedGcpTransformOptions
} from '../../lib/options.js'
import {
  mustContainGcpsMessage,
  parseProjectedGcpTransformerInputOptions,
  parseProjectedGcpTransformerOptions,
  parseProjectedGcpTransformOptions
} from '../../lib/parse.js'

import type { GeojsonGeometry } from '@allmaps/types/geojson.js'

export function geojson() {
  const command = addProjectedGcpTransformerOptions(
    addProjectedGcpTransformOptions(
      addAnnotationOptions(
        new Command('geojson')
          .argument('[files...]')
          .summary('transform GeoJSON to SVG')
          .description(
            'Transform GeoJSON to SVG using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation.'
          )
      )
    )
  )

  return command.action(async (files, options) => {
    const { gcps, transformationType, internalProjection } =
      parseProjectedGcpTransformerInputOptions(options)
    const partialProjectedGcpTransformerOptions =
      parseProjectedGcpTransformerOptions(options)
    const partialProjectedGcpTransformOptions =
      parseProjectedGcpTransformOptions(options)

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

    const geojsonGeometries = (await parseJsonInput(files)) as GeojsonGeometry[]
    const geojsonFeatureCollection =
      geojsonGeometriesToGeojsonFeatureCollection(geojsonGeometries)

    const svg =
      ProjectedGcpTransformer.transformGeojsonFeatureCollectionToSvgString(
        projectedTransformer,
        geojsonFeatureCollection
      )

    printString(svg)
  })
}
