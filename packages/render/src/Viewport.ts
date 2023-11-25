import { composeTransform } from './shared/matrix.js'
import {
  computeBbox,
  bboxToRectangle,
  webMercatorToLonLat,
  bboxToExtent
} from '@allmaps/stdlib'

import type { Point, Rectangle, Size, Bbox, Transform } from '@allmaps/types'

/**
 * The viewport describes the view on the rendered map.
 * @export
 * @class Viewport
 * @typedef {Viewport}
 * @extends {EventTarget}
 * @property {Point} geoCenter - Center point of the viewport, in lon lat geo coordinates.
 * @property {Rectangle} geoRectangle - Rotated rectangle (possibly quadrilateral) of the viewport point, in lon lat geo coordinates.
 * @property {Size} geoSize - Size of the viewport in lon lat geo coordinates, as [width, height]. (This is the size of the bbox of the rectangle, since lon lat only makes sense in in that case).
 * @property {Bbox} geoBbox - Bbox of the rotated rectangle of the viewport, in lon lat geo coordinates.
 * @property {Point} projectedGeoCenter - Center point of the viewport, in projected geo coordinates.
 * @property {Rectangle} projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geo coordinates.
 * @property {Size} projectedGeoSize - Size of the viewport in projected geo coordinates, as [width, height]. (This is not the size of the bbox of the rotated rectangle, but the width and hight of the rectangle).
 * @property {Bbox} projectedGeoBbox - Bbox of the rotated rectangle of the viewport, in projected geo coordinates.
 * @property {number} rotation - Rotation of the viewport with respect to the projected coordinate system.
 * @property {number} projectedGeoPerViewportScale - Resolution of the viewport, in projected geo coordinates per viewport pixel.
 * @property {Point} viewportCenter - Center point of the viewport, in viewport pixels.
 * @property {Rectangle} viewportRectangle - Rectangle of the viewport point, in viewport pixels.
 * @property {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
 * @property {Bbox} viewportBbox - Bbox of the viewport, in viewport pixels.
 * @property {number} devicePixelRatio - The devicePixelRatio of the viewport.
 * @property {Point} canvasCenter - Center point of the HTMLCanvasElement of the viewport, in canvas pixels.
 * @property {Rectangle} canvasRectangle - Rectangle of the HTMLCanvasElement of the viewport, in canvas pixels.
 * @property {Size} canvasSize - Size of the HTMLCanvasElement of the viewport in canvas pixels (viewportSize*devicePixelRatio), as [width, height].
 * @property {Bbox} canvasBbox - Bbox of the HTMLCanvasElement of the viewport, in canvas pixels.
 * @property {number} projectedGeoPerCanvasScale - Scale of the viewport, in projected geo coordinates per canvas pixel (resolution/devicePixelRatio).
 * @property {Transform} projectedGeoToViewportTransform - Transform from projected geo coordinates to viewport pixels. Equivalent to OpenLayer coordinateToPixelTransform.
 * @property {Transform} projectedGeoToWebGL2Transform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayer projectionTransform.
 */
export default class Viewport extends EventTarget {
  geoCenter: Point
  geoRectangle: Rectangle
  geoSize: Size
  geoBbox: Bbox
  projectedGeoCenter: Point
  projectedGeoRectangle: Rectangle
  projectedGeoSize: Size
  projectedGeoBbox: Bbox
  rotation: number
  projectedGeoPerViewportScale: number
  viewportCenter: Point
  viewportRectangle: Rectangle
  viewportSize: Size
  viewportBbox: Bbox
  devicePixelRatio: number
  canvasCenter: Point
  canvasRectangle: Rectangle
  canvasSize: Size
  canvasBbox: Bbox
  projectedGeoPerCanvasScale: number
  projectedGeoToViewportTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectedGeoToWebGL2Transform: Transform = [1, 0, 0, 1, 0, 0]

  /**
   * Creates an instance of Viewport.
   *
   * @constructor
   * @param {Point} projectedGeoCenter - Center point of the viewport, in projected coordinates.
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {number} rotation - Rotation of the viewport with respect to the project coordinate system.
   * @param {number} projectedGeoPerViewportScale - Resolution of the viewport, in projection coordinates per viewport pixel.
   * @param {number} devicePixelRatio - The devicePixelRatio of the viewport.
   */
  constructor(
    projectedGeoCenter: Point,
    viewportSize: Size,
    rotation: number,
    projectedGeoPerViewportScale: number,
    devicePixelRatio = 1
  ) {
    super()
    // TODO: should this still extend EventTartget and hence include super()?

    this.projectedGeoCenter = projectedGeoCenter
    this.projectedGeoPerViewportScale = projectedGeoPerViewportScale
    this.rotation = rotation
    this.viewportSize = viewportSize
    this.devicePixelRatio = devicePixelRatio

    this.projectedGeoRectangle = this.computeProjectedGeoRectangle(
      this.projectedGeoCenter,
      this.projectedGeoPerViewportScale,
      this.rotation,
      this.viewportSize
    )
    this.projectedGeoBbox = computeBbox(this.projectedGeoRectangle)
    this.projectedGeoSize = [
      this.viewportSize[0] * projectedGeoPerViewportScale,
      this.viewportSize[1] * projectedGeoPerViewportScale
    ]

    this.geoCenter = webMercatorToLonLat(this.projectedGeoCenter)
    // TODO: improve this with an interpolated back-projection, resulting in a ring
    this.geoRectangle = this.projectedGeoRectangle.map((point) => {
      return webMercatorToLonLat(point)
    }) as Rectangle
    this.geoBbox = computeBbox(this.geoRectangle)
    this.geoSize = bboxToExtent(this.geoBbox)

    this.viewportCenter = [this.viewportSize[0] / 2, this.viewportSize[1] / 2]
    this.viewportBbox = [0, 0, ...this.viewportSize]
    this.viewportRectangle = bboxToRectangle(this.viewportBbox)

    this.canvasCenter = [
      this.viewportCenter[0] * this.devicePixelRatio,
      this.viewportSize[1] * this.devicePixelRatio
    ]
    this.canvasSize = [
      this.viewportSize[0] * this.devicePixelRatio,
      this.viewportSize[1] * this.devicePixelRatio
    ]
    this.canvasBbox = [0, 0, ...this.canvasSize]
    this.canvasRectangle = bboxToRectangle(this.canvasBbox)

    this.projectedGeoPerCanvasScale =
      this.projectedGeoPerViewportScale / this.devicePixelRatio

    this.projectedGeoToViewportTransform =
      this.composeProjectedGeoToViewportTransform()
    this.projectedGeoToWebGL2Transform =
      this.composeProjectedGeoToWebGL2Transform()
  }

  private composeProjectedGeoToViewportTransform(): Transform {
    return composeTransform(
      this.viewportSize[0] / 2,
      this.viewportSize[1] / 2,
      1 / this.projectedGeoPerViewportScale,
      -1 / this.projectedGeoPerViewportScale,
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToWebGL2Transform(): Transform {
    return composeTransform(
      0,
      0,
      2 / (this.projectedGeoPerViewportScale * this.viewportSize[0]),
      2 / (this.projectedGeoPerViewportScale * this.viewportSize[1]),
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  /** Returns a rotated rectangle in projected geo coordinates */
  private computeProjectedGeoRectangle(
    projectedGeoCenter: Point,
    projectedGeoPerViewportScale: number,
    rotation: number,
    viewportSize: Size
  ): Rectangle {
    const dx = (projectedGeoPerViewportScale * viewportSize[0]) / 2
    const dy = (projectedGeoPerViewportScale * viewportSize[1]) / 2
    const cosRotation = Math.cos(rotation)
    const sinRotation = Math.sin(rotation)
    const xCos = dx * cosRotation
    const xSin = dx * sinRotation
    const yCos = dy * cosRotation
    const ySin = dy * sinRotation
    const x = projectedGeoCenter[0]
    const y = projectedGeoCenter[1]
    return [
      [x - xCos + ySin, y - xSin - yCos],
      [x - xCos - ySin, y - xSin + yCos],
      [x + xCos - ySin, y + xSin + yCos],
      [x + xCos + ySin, y + xSin - yCos]
    ]
  }
}
