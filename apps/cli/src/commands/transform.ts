import { Command } from 'commander'

import position from './transform/position.js'
import svg from './transform/svg.js'
import geojson from './transform/geojson.js'
import resourceMask from './transform/resource-mask.js'

export default function transform() {
  return new Command('transform')
    .summary('transform SVG to GeoJSON and vice versa')
    .description(
      'Transforms SVGs with resource coordinates to GeoJSON and vice versa, using a Georeference Annotation'
    )
    .addCommand(position())
    .addCommand(svg())
    .addCommand(geojson())
    .addCommand(resourceMask())
}
