import { applyTransform, composeTransform } from './shared/matrix.js'
import { computeBbox, bboxToRectangle } from '@allmaps/stdlib'

import type { Point, Rectangle, Size, Bbox, Transform } from '@allmaps/types'

/**
 * The viewport describes the view on the rendered map.
 * @export
 * @class Viewport
 * @typedef {Viewport}
 * @extends {EventTarget}
 * @property {Size} projectedGeoSize - Size of the viewport in projected geo coordinates, as [width, height].
 * @property {Point} projectedGeoCenter - Center point of the viewport, in projected geo coordinates.
 * @property {Rectangle} projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geo coordinates.
 * @property {Bbox} projectedGeoBbox - Bbox of the rotated rectangle of the viewport, in projected geo coordinates.
 * @property {number} rotation - Rotation of the viewport with respect to the projected coordinate system.
 * @property {number} resolution - Resolution of the viewport, in projected geo coordinates per viewport pixel.
 * @property {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
 * @property {Point} viewportGeoCenter - Center point of the viewport, in viewport pixel coordinates.
 * @property {Rectangle} projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geo coordinates.
 * @property {Bbox} viewportBbox - Bbox of the viewport, in viewport pixels.
 * @property {number} devicePixelRatio - The devicePixelRatio of the viewport.
 * @property {number} scale - Scale of the viewport, in projection coordinates per canvas pixel (resolution/devicePixelRatio).
 * @property {Size} canvasSize - Size of the HTMLCanvasElement of the viewport (viewportSize*devicePixelRatio), as [width, height].
 * @property {Transform} coordinateToPixelTransform - Transform from projected geo coordinates to viewport pixels. Equivalent to OpenLayer coordinateToPixelTransform.
 * @property {Transform} projectionTransform - Transform from projected geo coordinates to view coordinates in the [-1, 1] range. Equivalent to OpenLayer projectionTransform.
 */
export default class Viewport extends EventTarget {
  projectedGeoSize: Size
  projectedGeoCenter: Point
  projectedGeoRectangle: Rectangle
  projectedGeoBbox: Bbox
  rotation: number
  resolution: number
  viewportSize: Size
  viewportCenter: Point
  viewportRectangle: Rectangle
  viewportBbox: Bbox
  devicePixelRatio: number
  canvasSize: Size
  scale: number
  coordinateToPixelTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectionTransform: Transform = [1, 0, 0, 1, 0, 0]

  /**
   * Creates an instance of Viewport.
   *
   * @constructor
   * @param {Point} projectedGeoCenter - Center point of the viewport, in projected coordinates.
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {number} rotation - Rotation of the viewport with respect to the project coordinate system.
   * @param {number} resolution - Resolution of the viewport, in projection coordinates per viewport pixel.
   * @param {number} devicePixelRatio - The devicePixelRatio of the viewport.
   */
  constructor(
    projectedGeoCenter: Point,
    viewportSize: Size,
    rotation: number,
    resolution: number,
    devicePixelRatio = 1
  ) {
    super()
    // TODO: should this still extend EventTartget and hence include super()?

    this.projectedGeoCenter = projectedGeoCenter
    this.resolution = resolution
    this.rotation = rotation
    this.viewportSize = viewportSize
    this.devicePixelRatio = devicePixelRatio

    this.viewportBbox = [0, 0, ...this.viewportSize]
    this.viewportRectangle = bboxToRectangle(this.viewportBbox)

    this.projectedGeoRectangle = this.computeProjectedGeoRectangle(
      this.projectedGeoCenter,
      this.resolution,
      this.rotation,
      this.viewportSize
    )
    this.projectedGeoBbox = computeBbox(this.projectedGeoRectangle)
    this.projectedGeoSize = [
      this.viewportSize[0] * resolution,
      this.viewportSize[1] * resolution
    ]

    this.scale = this.resolution / this.devicePixelRatio
    this.canvasSize = [
      this.viewportSize[0] * this.devicePixelRatio,
      this.viewportSize[1] * this.devicePixelRatio
    ]

    this.setCoordinateToPixelTransform()
    this.setProjectionTransform()

    this.viewportCenter = applyTransform(
      this.coordinateToPixelTransform,
      this.projectedGeoCenter
    )
  }

  private setCoordinateToPixelTransform(): void {
    this.coordinateToPixelTransform = composeTransform(
      this.viewportSize[0] / 2,
      this.viewportSize[1] / 2,
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
      2 / (this.resolution * this.viewportSize[0]),
      2 / (this.resolution * this.viewportSize[1]),
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  /** Returns a rotated rectangle in projected geo coordinates */
  private computeProjectedGeoRectangle(
    center: Point,
    resolution: number,
    rotation: number,
    viewportSize: Size
  ): Rectangle {
    const dx = (resolution * viewportSize[0]) / 2
    const dy = (resolution * viewportSize[1]) / 2
    const cosRotation = Math.cos(rotation)
    const sinRotation = Math.sin(rotation)
    const xCos = dx * cosRotation
    const xSin = dx * sinRotation
    const yCos = dy * cosRotation
    const ySin = dy * sinRotation
    const x = center[0]
    const y = center[1]
    return [
      [x - xCos + ySin, y - xSin - yCos],
      [x - xCos - ySin, y - xSin + yCos],
      [x + xCos - ySin, y + xSin + yCos],
      [x + xCos + ySin, y + xSin - yCos]
    ]
  }
}
