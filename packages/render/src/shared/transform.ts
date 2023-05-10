import { TransformerInterface } from '@allmaps/transform'

import type { BBox, SVGPolygon } from './types.js'

export function geoBBoxToSVGPolygon(
  transformer: TransformerInterface,
  bbox: BBox
): SVGPolygon {
  const [y1, x1, y2, x2] = bbox

  return [
    transformer.toResource([y1, x1]),
    transformer.toResource([y1, x2]),
    transformer.toResource([y2, x2]),
    transformer.toResource([y2, x1])
  ]
}
