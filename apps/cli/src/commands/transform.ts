import { Command } from '@commander-js/extra-typings'

import svg from './transform/svg.js'
import geojson from './transform/geojson.js'
import resourceMask from './transform/resource-mask.js'
import coordinates from './transform/coordinates.js'

export default function transform() {
  return new Command('transform')
    .summary(
      'transform resource coordinates to geospatial coordinates and vice versa'
    )
    .description(
      'Transforms resource coordinates to geospatial coordinates and vice versa'
    )
    .addCommand(svg())
    .addCommand(geojson())
    .addCommand(resourceMask())
    .addCommand(coordinates())
}
