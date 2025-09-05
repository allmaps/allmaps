import { Command } from '@commander-js/extra-typings'

import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
import {
  geojsonFeaturesToGeojsonFeatureCollection,
  geojsonGeometryToGeojsonFeature,
  geometryToGeojsonGeometry,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'

import { parseJsonInput, printJson } from '../../lib/io.js'
import {
  mustContainGcpsMessage,
  parseAnnotationsValidateMaps,
  parseProjectedGcpTransformOptions,
  parseProjectedGcpTransformerInputOptionsAndMap,
  parseProjectedGcpTransformerOptions
} from '../../lib/parse.js'
import {
  addProjectedGcpTransformerInputOptions,
  addProjectedGcpTransformerOptions,
  addProjectedGcpTransformOptions
} from '../../lib/options.js'

export function resourceMask() {
  const command = addProjectedGcpTransformerOptions(
    addProjectedGcpTransformOptions(
      addProjectedGcpTransformerInputOptions(
        new Command('resource-mask')
          .argument('[files...]')
          .summary('transform resource masks to GeoJSON')
          .description(
            'Transform SVG resource masks of input Georeference Annotations to GeoJSON using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation itself.\n' +
              "This is a faster alternative for 'transform svg' where the resource mask from the Georeference Annotation specified in the arguments is also the input SVG."
          )
      )
    )
  )

  return command.action(async (files, options) => {
    const jsonValues = await parseJsonInput(files)
    const maps = parseAnnotationsValidateMaps(jsonValues)
    const partialProjectedGcpTransformerOptions =
      parseProjectedGcpTransformerOptions(options)
    const partialProjectedGcpTransformOptions =
      parseProjectedGcpTransformOptions(options)

    const features = []
    for (const map of maps) {
      let { gcps, transformationType, internalProjection, projection } =
        parseProjectedGcpTransformerInputOptionsAndMap(options, map)

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

      const polygon = projectedTransformer.transformToGeo([map.resourceMask])
      const geojsonPolygon = geometryToGeojsonGeometry(polygon)

      features.push(
        geojsonGeometryToGeojsonFeature(geojsonPolygon, {
          imageId: map.resource.id
        })
      )
    }

    const featureCollection =
      geojsonFeaturesToGeojsonFeatureCollection(features)
    printJson(featureCollection)
  })
}
