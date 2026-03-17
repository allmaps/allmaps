import { Command } from '@commander-js/extra-typings'

import { findBestFrame } from '@allmaps/frame'
import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
import {
  geojsonGeometryToGeojsonFeature,
  geojsonFeaturesToGeojsonFeatureCollection,
  geometryToGeojsonGeometry,
  combineBboxes,
  computeBbox
} from '@allmaps/stdlib'

import { parseJsonInput, printJson } from '../lib/io.js'
import {
  mustContainGcpsMessage,
  parseAnnotationsValidateMaps
} from '../lib/parse.js'

import type { Bbox, Polygon } from '@allmaps/types'

/**
 * Convert a bbox [minLon, minLat, maxLon, maxLat] to a closed Polygon.
 */
function bboxToPolygon(bbox: Bbox): Polygon {
  return [
    [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[1]],
      [bbox[2], bbox[3]],
      [bbox[0], bbox[3]],
      [bbox[0], bbox[1]]
    ]
  ]
}

export function frame() {
  const command = new Command('frame')
    .argument('[files...]')
    .summary('compute best viewport frame for georeferenced maps')
    .description(
      'Compute the optimal viewport bounding box for a set of georeference annotations using the @allmaps/frame package. ' +
        'The algorithm finds the best-fitting viewport that balances map coverage and minimal background space. ' +
        'Output is a GeoJSON Feature or FeatureCollection representing the viewport bounds.'
    )
    .option(
      '-w, --width <width>',
      'viewport width in pixels',
      (val) => parseInt(val, 10),
      1200
    )
    .option(
      '-h, --height <height>',
      'viewport height in pixels',
      (val) => parseInt(val, 10),
      630
    )
    .option(
      '--include-maps',
      'include map polygons in the output FeatureCollection'
    )
    .option(
      '--include-bbox',
      'include original bounding box in the output FeatureCollection'
    )

  return command.action(async (files, options) => {
    const { width, height, includeMaps, includeBbox } = options

    // Validate dimensions
    if (width <= 0 || !Number.isFinite(width)) {
      throw new Error('Width must be a positive number')
    }
    if (height <= 0 || !Number.isFinite(height)) {
      throw new Error('Height must be a positive number')
    }

    const jsonValues = await parseJsonInput(files)
    const maps = parseAnnotationsValidateMaps(jsonValues)

    if (maps.length === 0) {
      throw new Error('No valid georeferenced maps found in input')
    }

    // Transform resourceMask to geoMask for each map
    const mapPolygons: Polygon[] = []

    for (const map of maps) {
      const { gcps } = map

      if (!gcps || gcps.length === 0) {
        throw new Error(mustContainGcpsMessage)
      }

      // Create transformer with lon-lat projection (default for findBestFrame)
      const projectedTransformer = new ProjectedGcpTransformer(
        gcps,
        map.transformation?.type || 'polynomial',
        {
          projection: lonLatProjection
        }
      )

      // Transform resourceMask from pixel coordinates to geographic coordinates
      const geoPolygon = projectedTransformer.transformToGeo([map.resourceMask])
      mapPolygons.push(geoPolygon)
    }

    // Compute best frame
    const bestFrame = findBestFrame(mapPolygons, [width, height])

    const features = []

    // Add map polygons if requested
    if (includeMaps) {
      for (let i = 0; i < mapPolygons.length; i++) {
        const geojsonPolygon = geometryToGeojsonGeometry(mapPolygons[i])
        const mapFeature = geojsonGeometryToGeojsonFeature(geojsonPolygon, {
          type: 'map-polygon',
          index: i,
          imageId: maps[i].resource.id
        })
        features.push(mapFeature)
      }
    }

    // Add viewport frame feature
    const viewportPolygon = bboxToPolygon(bestFrame)
    const viewportGeojson = geometryToGeojsonGeometry(viewportPolygon)
    const viewportFeature = geojsonGeometryToGeojsonFeature(viewportGeojson, {
      type: 'viewport',
      viewportWidth: width,
      viewportHeight: height,
      aspectRatio: width / height,
      bbox: bestFrame,
      stroke: '#ff0000',
      'stroke-width': 3,
      fill: '#ff0000',
      'fill-opacity': 0.1
    })
    features.push(viewportFeature)

    // Add original bbox if requested
    if (includeBbox) {
      const mapBboxes = mapPolygons.map((polygon) => computeBbox(polygon[0]))
      const originalBbox = combineBboxes(...mapBboxes)
      if (originalBbox) {
        const bboxPolygon = bboxToPolygon(originalBbox)
        const bboxGeojson = geometryToGeojsonGeometry(bboxPolygon)
        const bboxFeature = geojsonGeometryToGeojsonFeature(bboxGeojson, {
          type: 'original-bbox',
          bbox: originalBbox,
          stroke: '#0000ff',
          'stroke-width': 1,
          'stroke-dasharray': '5,5',
          fill: 'none',
          'fill-opacity': 0
        })
        features.push(bboxFeature)
      }
    }

    // Output single feature or FeatureCollection
    if (features.length === 1) {
      printJson(features[0])
    } else {
      const featureCollection =
        geojsonFeaturesToGeojsonFeatureCollection(features)
      printJson(featureCollection)
    }
  })
}
