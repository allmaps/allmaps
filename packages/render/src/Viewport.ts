import type { Point, Size, Bbox, Transform } from '@allmaps/types'
import { composeTransform } from './shared/matrix.js'

/**
 * The viewport describes the view on the rendered map.
 * @export
 * @class Viewport
 * @typedef {Viewport}
 * @extends {EventTarget}
 * @property {Bbox} projectedGeoBbox - Bbox displayed in the viewport, in projected geo coordinates.
 * @property {Point} projectedGeoCenter - Center of of bbox displayed in the viewport point, in projected coordinates
 * @property {Size} size - Size as [width, height] of the viewport in pixels of the viewport.
 * @property {number} resolution - Resolution of the viewport, in projection units per pixel
 * @property {number} rotation - Rotation of the viewport with respect to the project coordinate system.
 * @property {number} devicePixelRatio - The devicePixelRatio of the viewport
 * @property {Size} canvasSize - Size of the HTMLCanvasElement of the viewport (pixels*devicePixelRatio).
 * @property {Transform} coordinateToPixelTransform - Transform from projected geo coordinates to pixels. Equivalent to OpenLayer coordinateToPixelTransform.
 * @property {Transform} projectionTransform - Transform from projected geo coordinates to view coordinates in the [-1, 1] range. Equivalent to OpenLayer projectionTransform.
 */
export default class Viewport extends EventTarget {
  projectedGeoBbox: Bbox
  projectedGeoCenter: Point
  size: Size
  resolution: number
  rotation: number
  devicePixelRatio: number
  canvasSize: Size
  coordinateToPixelTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectionTransform: Transform = [1, 0, 0, 1, 0, 0]

  /**
   * Creates an instance of Viewport.
   *
   * @constructor
   * @param {Bbox} projectedGeoBbox - Bbox displayed in the viewport, in projected geo coordinates.
   * @param {Size} size - Size of the viewport in pixels, as [width, height].
   * @param {number} rotation - Rotation of the viewport with respect to the project coordinate system.
   * @param {number} devicePixelRatio - The devicePixelRatio of the viewport.
   */
  constructor(
    projectedGeoBbox: Bbox,
    size: Size,
    rotation: number,
    devicePixelRatio: number
  ) {
    super()
    // TODO: should this still extend EventTartget and hence include super()?

    this.projectedGeoBbox = projectedGeoBbox
    this.size = size
    this.rotation = rotation
    this.devicePixelRatio = devicePixelRatio

    this.projectedGeoCenter = [
      (this.projectedGeoBbox[0] + this.projectedGeoBbox[2]) / 2,
      (this.projectedGeoBbox[1] + this.projectedGeoBbox[3]) / 2
    ] as [number, number]
    const xResolution =
      (this.projectedGeoBbox[2] - this.projectedGeoBbox[0]) / this.size[0]
    const yResolution =
      (this.projectedGeoBbox[3] - this.projectedGeoBbox[1]) / this.size[1]
    this.resolution = Math.max(xResolution, yResolution)

    this.canvasSize = [
      this.size[0] * this.devicePixelRatio,
      this.size[1] * this.devicePixelRatio
    ]

    this.setCoordinateToPixelTransform()
    this.setProjectionTransform()
  }

  private setCoordinateToPixelTransform(): void {
    this.coordinateToPixelTransform = composeTransform(
      this.size[0] / 2,
      this.size[1] / 2,
      1 / this.resolution,
      -1 / this.resolution,
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private setProjectionTransform(): void {
    this.projectionTransform = composeTransform(
      0,
      0,
      2 / (this.resolution * this.size[0]),
      2 / (this.resolution * this.size[1]),
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }
}
