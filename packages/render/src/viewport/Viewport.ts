import WarpedMapList from '../maps/WarpedMapList.js'
import {
  composeTransform,
  applyTransform,
  invertTransform
} from '../shared/matrix.js'

import {
  computeBbox,
  bboxToCenter,
  bboxToRectangle,
  bboxToSize,
  sizesToScale,
  bufferBboxByRatio,
  webMercatorToLonLat
} from '@allmaps/stdlib'

import type WarpedMap from '../maps/WarpedMap.js'

import type {
  Point,
  Rectangle,
  Size,
  Bbox,
  Transform,
  Fit
} from '@allmaps/types'

/**
 * The viewport describes the view on the rendered map.
 * @export
 * @class Viewport
 * @typedef {Viewport}
 * @extends {EventTarget}
 * @property {Point} geoCenter - Center point of the viewport, in longitude/latitude coordinates.
 * @property {Rectangle} geoRectangle - Rotated rectangle (possibly quadrilateral) of the viewport point, in longitude/latitude coordinates.
 * @property {Size} geoSize - Size of the viewport in longitude/latitude coordinates, as [width, height]. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property {number} geoResolution - Resolution of the viewport in longitude/latitude coordinates, as width * height. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property {Bbox} geoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in longitude/latitude coordinates.
 * @property {Point} projectedGeoCenter - Center point of the viewport, in projected geo coordinates.
 * @property {Rectangle} projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geo coordinates.
 * @property {Size} projectedGeoSize - Size of the viewport in projected geo coordinates, as [width, height]. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property {number} projectedGeoResolution - Resolution of the viewport in projected geo coordinates, as width * height. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property {Bbox} projectedGeoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in projected geo coordinates.
 * @property {number} rotation - Rotation of the viewport with respect to the projected coordinate system.
 * @property {number} projectedGeoPerViewportScale - Scale of the viewport, in projected geo coordinates per viewport pixel.
 * @property {Point} viewportCenter - Center point of the viewport, in viewport pixels.
 * @property {Rectangle} viewportRectangle - Rectangle of the viewport point, in viewport pixels.
 * @property {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
 * @property {number} viewportResolution - Resolution of the viewport in viewport pixels, as width * height.
 * @property {Bbox} viewportBbox - Bounding box of the viewport, in viewport pixels.
 * @property {number} devicePixelRatio - The devicePixelRatio of the viewport.
 * @property {Point} canvasCenter - Center point of the HTMLCanvasElement of the viewport, in canvas pixels.
 * @property {Rectangle} canvasRectangle - Rectangle of the HTMLCanvasElement of the viewport, in canvas pixels.
 * @property {Size} canvasSize - Size of the HTMLCanvasElement of the viewport in canvas pixels (viewportSize*devicePixelRatio), as [width, height].
 * @property {number} canvasResolution - Resolution of the HTMLCanvasElement of the viewport in canvas pixels (viewportSize*devicePixelRatio), as width * height.
 * @property {Bbox} canvasBbox - Bounding box of the HTMLCanvasElement of the viewport, in canvas pixels.
 * @property {number} projectedGeoPerCanvasScale - Scale of the viewport, in projected geo coordinates per canvas pixel (projectedGeoPerViewportScale/devicePixelRatio).
 * @property {Transform} projectedGeoToViewportTransform - Transform from projected geo coordinates to viewport pixels. Equivalent to OpenLayers coordinateToPixelTransform.
 * @property {Transform} projectedGeoToClipTransform - Transform from projected geo coordinates to WebGL coordinates in the [-1, 1] range. Equivalent to OpenLayers projectionTransform.
 * @property {Transform} viewportToClipTransform - Transform from viewport coordinates to WebGL coordinates in the [-1, 1] range.
 */
export default class Viewport {
  geoCenter: Point
  geoRectangle: Rectangle
  geoSize: Size
  geoResolution: number
  geoRectangleBbox: Bbox
  projectedGeoCenter: Point
  projectedGeoRectangle: Rectangle
  projectedGeoSize: Size
  projectedGeoResolution: number
  projectedGeoRectangleBbox: Bbox
  rotation: number
  projectedGeoPerViewportScale: number

  viewportCenter: Point
  viewportRectangle: Rectangle
  viewportSize: Size
  viewportResolution: number
  viewportBbox: Bbox

  devicePixelRatio: number
  canvasCenter: Point
  canvasRectangle: Rectangle
  canvasSize: Size
  canvasResolution: number
  canvasBbox: Bbox

  projectedGeoPerCanvasScale: number
  projectedGeoToViewportTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectedGeoToClipTransform: Transform = [1, 0, 0, 1, 0, 0]
  viewportToClipTransform: Transform = [1, 0, 0, 1, 0, 0]

  /**
   * Creates a new Viewport
   *
   * @constructor
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {Point} projectedGeoCenter - Center point of the viewport, in projected coordinates.
   * @param {number} projectedGeoPerViewportScale - Scale of the viewport, in projection coordinates per viewport pixel.
   * @param {number} rotation - Rotation of the viewport with respect to the project coordinate system.
   * @param {number} [devicePixelRatio=1] - The devicePixelRatio of the viewport.
   */
  constructor(
    viewportSize: Size,
    projectedGeoCenter: Point,
    projectedGeoPerViewportScale: number,
    rotation: number,
    devicePixelRatio = 1
  ) {
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
    this.projectedGeoRectangleBbox = computeBbox(this.projectedGeoRectangle)
    this.projectedGeoSize = [
      this.viewportSize[0] * projectedGeoPerViewportScale,
      this.viewportSize[1] * projectedGeoPerViewportScale
    ]
    this.projectedGeoResolution =
      this.projectedGeoSize[0] * this.projectedGeoSize[1]

    this.geoCenter = webMercatorToLonLat(this.projectedGeoCenter)
    // TODO: improve this with an interpolated back-projection, resulting in a ring
    this.geoRectangle = this.projectedGeoRectangle.map((point) => {
      return webMercatorToLonLat(point)
    }) as Rectangle
    this.geoRectangleBbox = computeBbox(this.geoRectangle)
    this.geoSize = bboxToSize(this.geoRectangleBbox)
    this.geoResolution = this.geoSize[0] * this.geoSize[1]

    this.viewportResolution = this.viewportSize[0] * this.viewportSize[1]
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
    this.canvasResolution = this.canvasSize[0] * this.canvasSize[1]
    this.canvasBbox = [0, 0, ...this.canvasSize]
    this.canvasRectangle = bboxToRectangle(this.canvasBbox)

    this.projectedGeoPerCanvasScale =
      this.projectedGeoPerViewportScale / this.devicePixelRatio

    this.projectedGeoToViewportTransform =
      this.composeProjectedGeoToViewportTransform()
    this.projectedGeoToClipTransform = this.composeProjectedGeoToClipTransform()
    this.viewportToClipTransform = this.composeViewportToClipTransform()
  }

  /**
   * Static method creates that creates a Viewport from a WarpedMapList
   *
   * @static
   * @template {WarpedMap} W
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {WarpedMapList<W>} warpedMapList - A WarpedMapList.
   * @param {number} [devicePixelRatio] - The devicePixelRatio of the viewport.
   * @param {Fit} [fit='contain'] - Whether the viewport should contain or cover the bbox of the warpedMapList.
   * @returns {Viewport} - A new Viewport object
   */
  static fromWarpedMapList<W extends WarpedMap>(
    viewportSize: Size,
    warpedMapList: WarpedMapList<W>,
    devicePixelRatio?: number,
    fit: Fit = 'contain',
    // TODO: instead of zoom parameter, add function to Viewport class
    // that allows zooming in/out
    zoom = 1
  ): Viewport {
    const projectedGeoCenter = warpedMapList.getProjectedCenter()
    const projectedGeoBbox = warpedMapList.getProjectedBbox()

    if (!projectedGeoCenter || !projectedGeoBbox) {
      throw new Error('WarpedMapList has no projected center or bbox')
    }

    const projectedGeoSize = bboxToSize(projectedGeoBbox)
    const projectedGeoPerViewportScale =
      sizesToScale(projectedGeoSize, viewportSize, fit) * (1 / zoom)

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale,
      0,
      devicePixelRatio
    )
  }

  /**
   * Static method creates that creates a Viewport from Bbox in projected geospatial coordinates.
   *
   * @static
   * @template {WarpedMap} W
   * @param {Size} viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param {WarpedMapList<W>} projectedGeoBbox - A projectedGeoBbox.
   * @param {number} [devicePixelRatio] - The devicePixelRatio of the viewport.
   * @param {Fit} [fit='contain'] - Whether the viewport should contain or cover the bbox of the warpedMapList.
   * @returns {Viewport} - A new Viewport object
   */
  static fromProjectedGeoBbox(
    viewportSize: Size,
    projectedGeoBbox: Bbox,
    devicePixelRatio?: number,
    fit: Fit = 'contain'
  ) {
    const projectedGeoCenter = bboxToCenter(projectedGeoBbox)

    const projectedGeoSize = bboxToSize(projectedGeoBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      projectedGeoSize,
      viewportSize,
      fit
    )

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale,
      0,
      devicePixelRatio
    )
  }

  getProjectedGeoBufferedRectangle(bufferFraction: number): Rectangle {
    const viewportBufferedBbox = bufferBboxByRatio(
      this.viewportBbox,
      bufferFraction
    )
    const viewportBufferedRectangle = bboxToRectangle(viewportBufferedBbox)
    return viewportBufferedRectangle.map((point) =>
      applyTransform(
        invertTransform(this.projectedGeoToViewportTransform),
        point
      )
    ) as Rectangle
  }

  private composeProjectedGeoToViewportTransform(): Transform {
    return composeTransform(
      this.viewportCenter[0],
      this.viewportCenter[1],
      1 / this.projectedGeoPerViewportScale,
      -1 / this.projectedGeoPerViewportScale,
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToClipTransform(): Transform {
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

  private composeViewportToClipTransform(): Transform {
    return composeTransform(
      0,
      0,
      2 / this.viewportSize[0],
      -2 / this.viewportSize[1],
      0,
      -this.viewportCenter[0],
      -this.viewportCenter[1]
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
