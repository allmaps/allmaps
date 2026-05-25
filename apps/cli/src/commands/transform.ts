import { Command } from '@commander-js/extra-typings'

import { svg } from './transform/svg.ts'
import { geojson } from './transform/geojson.ts'
import { resourceMask } from './transform/resource-mask.ts'
import { coordinates } from './transform/coordinates.ts'

export function transform() {
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
