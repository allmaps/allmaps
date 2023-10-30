import type { Size, Bbox, Transform } from '@allmaps/types'

export default class Viewport extends EventTarget {
  size?: Size
  geoBbox?: Bbox
  coordinateToPixelTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectionTransform: Transform = [1, 0, 0, 1, 0, 0]

  constructor() {
    super()
    // TODO: add size and geoBbox here?
    // TODO: should this still extend EventTartget and hence include super()?
  }

  updateViewport(
    size: Size,
    geoBbox: Bbox,
    coordinateToPixelTransform: Transform,
    projectionTransform: Transform
  ): void {
    this.size = size
    this.geoBbox = geoBbox
    this.coordinateToPixelTransform = coordinateToPixelTransform
    this.projectionTransform = projectionTransform
  }
}
