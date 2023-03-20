import { Command } from 'commander'

import svg from './transform/svg.js'
import geojson from './transform/geojson.js'
import pixelMask from './transform/pixel-mask.js'

export default function transform() {
  return new Command('transform')
    .summary('transform SVG to GeoJSON and vice versa')
    .description(
      'Transforms SVGs with resource coordinates to GeoJSON and vice versa, using a Georeference Annotation'
    )
    .addCommand(svg())
    .addCommand(geojson())
    .addCommand(pixelMask())
}
