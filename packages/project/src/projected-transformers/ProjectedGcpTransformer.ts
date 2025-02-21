import proj4 from 'proj4'

import { mergeOptions } from '@allmaps/stdlib'
import { GcpTransformer, TransformationType } from '@allmaps/transform'

import { ProjectedTransformerOptions } from '../shared/types.js'
import {
  defaultProjectedTransformerOptions,
  defaultProjections,
  lonLatProjection
} from '../shared/project-functions.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Gcp } from '@allmaps/types'

/**
 * Class for Projected Ground Control Point Transformers.
 *
 * A Projected GCP Transformer can transform input geometries between 'resource' and 'projected geo' spaces.
 *
 * It does this using a transformation (of a certain type) built from
 * a set of Ground Control Points (with coordinates in
 * resource and geo space), a transformation type,
 * and an internal projection and projection (by default both are WebMercator 'EPSG:3857').
 *
 * A postForward function is built from the internal projection to the projection (by default an identity projection).
 * A preBackward function is built from the projection to the internal projection (by default an identity projection).
 * GCPs are projected expected in lon-lat 'EPSG:4326' and projected to the internal projection (by default a lon-lat to WebMercator projection).
 *
 * Like the GCP Transformer class it extends,
 * it has a method to transform 'toGeo' (from resource to projected geo space)
 * and 'toResource' (from projected geo to resource space),
 *
 * Like the GCP Transformer class it extends,
 * the `differentHandedness` setting is `true` by default,
 * since we expect the resource coordinates to identify pixels on an image,
 * with origin in the top left and the y-axis pointing down.
 * */
export class ProjectedGcpTransformer extends GcpTransformer {
  /**
   * Create a ProjectedGcpTransformer
   *
   * @param gcps - An array of Ground Control Points (GCPs) in lon-lat 'EPSG:4326'
   * @param type - The transformation type
   * @param partialProjectedTransformerOptions - Projected Transformer options
   */ constructor(
    gcps: Gcp[],
    type: TransformationType = 'polynomial',
    partialProjectedTransformerOptions?: Partial<ProjectedTransformerOptions>
  ) {
    const projectedTransformerOptions = mergeOptions(
      defaultProjectedTransformerOptions,
      partialProjectedTransformerOptions
    )

    if (
      !defaultProjections.has(
        projectedTransformerOptions.internalProjection.name
      )
    ) {
      proj4.defs(
        projectedTransformerOptions.internalProjection.name,
        projectedTransformerOptions.internalProjection.definition
      )
    }
    if (!defaultProjections.has(projectedTransformerOptions.projection.name)) {
      proj4.defs(
        projectedTransformerOptions.projection.name,
        projectedTransformerOptions.projection.definition
      )
    }

    const internalProjectionToProjectionConverter = proj4(
      projectedTransformerOptions.internalProjection.name,
      projectedTransformerOptions.projection.name
    )
    const postForward = internalProjectionToProjectionConverter.forward
    const preBackward = internalProjectionToProjectionConverter.inverse

    const lonLatToProjectionConverter = proj4(
      lonLatProjection.name,
      projectedTransformerOptions.projection.name
    )
    const lonLatToProjection = lonLatToProjectionConverter.forward

    const partialTransformerOptions = {
      ...partialProjectedTransformerOptions,
      postForward,
      preBackward
    }

    gcps = gcps.map((gcp) => {
      return {
        resource: gcp.resource,
        geo: lonLatToProjection(gcp.geo)
      }
    })

    super(gcps, type, partialTransformerOptions)
  }

  static fromGeoreferencedMap(
    georeferencedMap: GeoreferencedMap,
    partialProjectedTransformerOptions?: Partial<ProjectedTransformerOptions>
  ): ProjectedGcpTransformer {
    // TODO: read projection from georeferencedMap
    // partialProjectedTransformerOptions = {
    //   projection: georeferencedMap.projection,
    //   internalProjection: georeferencedMap.iternalProjection,
    //   ...partialProjectedTransformerOptions
    // }

    return new ProjectedGcpTransformer(
      georeferencedMap.gcps,
      georeferencedMap.transformation?.type || 'polynomial',
      partialProjectedTransformerOptions
    )
  }
}
