import { WarpedMapList } from '../maps/WarpedMapList.js'
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
  scaleSize,
  rotatePoints,
  translatePoints,
  sizeToResolution,
  sizeToBbox,
  sizeToCenter,
  scalePoint,
  sizeToRectangle,
  midPoint,
  scalePoints,
  rotatePoint,
  mergeOptions,
  convexHull
} from '@allmaps/stdlib'
import { webMercatorToLonLat } from '@allmaps/project'

import type { WarpedMap } from '../maps/WarpedMap.js'

import type {
  Point,
  Rectangle,
  Size,
  Bbox,
  Transform,
  Fit,
  Polygon,
  Ring
} from '@allmaps/types'

export type ViewportOptions = {
  fit: Fit
  rotation: number
  devicePixelRatio: number
  zoom: number
}

const defaultViewportOptions = {
  fit: 'contain',
  rotation: 0,
  devicePixelRatio: 1,
  zoom: 1
} as ViewportOptions

/**
 * The viewport describes the view on the rendered map.
 * @property geoCenter - Center point of the viewport, in longitude/latitude coordinates.
 * @property geoRectangle - Rotated rectangle (possibly quadrilateral) of the viewport point, in longitude/latitude coordinates.
 * @property geoSize - Size of the viewport in longitude/latitude coordinates, as [width, height]. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property geoResolution - Resolution of the viewport in longitude/latitude coordinates, as width * height. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property geoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in longitude/latitude coordinates.
 * @property projectedGeoCenter - Center point of the viewport, in projected geo coordinates.
 * @property projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geo coordinates.
 * @property projectedGeoSize - Size of the viewport in projected geo coordinates, as [width, height]. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property projectedGeoResolution - Resolution of the viewport in projected geo coordinates, as width * height. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property projectedGeoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in projected geo coordinates.
 * @property rotation - Rotation of the viewport with respect to the projected coordinate system.
 * @property projectedGeoPerViewportScale - Scale of the viewport, in projected geo coordinates per viewport pixel.
 * @property viewportCenter - Center point of the viewport, in viewport pixels.
 * @property viewportRectangle - Rectangle of the viewport point, in viewport pixels.
 * @property viewportSize - Size of the viewport in viewport pixels, as [width, height].
 * @property viewportResolution - Resolution of the viewport in viewport pixels, as width * height.
 * @property viewportBbox - Bounding box of the viewport, in viewport pixels.
 * @property devicePixelRatio - The devicePixelRatio of the viewport.
 * @property canvasCenter - Center point of the canvas, in canvas pixels.
 * @property canvasRectangle - Rectangle of the canvas, in canvas pixels.
 * @property canvasSize - Size of the canvas in canvas pixels (viewportSize*devicePixelRatio), as [width, height].
 * @property canvasResolution - Resolution of the canvas in canvas pixels (viewportSize*devicePixelRatio), as width * height.
 * @property canvasBbox - Bounding box of the canvas, in canvas pixels.
 * @property projectedGeoPerCanvasScale - Scale of the viewport, in projected geo coordinates per canvas pixel (projectedGeoPerViewportScale/devicePixelRatio).
 * @property projectedGeoToViewportTransform - Transform from projected geo coordinates to viewport pixels. Equivalent to OpenLayers coordinateToPixelTransform.
 * @property projectedGeoToCanvasTransform - Transform from projected geo coordinates to canvas pixels.
 * @property projectedGeoToClipTransform - Transform from projected geo coordinates to WebGL coordinates in the [-1, 1] range. Equivalent to OpenLayers projectionTransform.
 * @property viewportToClipTransform - Transform from viewport coordinates to WebGL coordinates in the [-1, 1] range.
 */
export class Viewport {
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
  projectedGeoToCanvasTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectedGeoToClipTransform: Transform = [1, 0, 0, 1, 0, 0]
  viewportToClipTransform: Transform = [1, 0, 0, 1, 0, 0]

  /**
   * Creates a new Viewport
   *
   * @constructor
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param projectedGeoCenter - Center point of the viewport, in projected coordinates.
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projection coordinates per viewport pixel.
   * @param rotation - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geo coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param devicePixelRatio - The devicePixelRatio of the viewport.
   */
  constructor(
    viewportSize: Size,
    projectedGeoCenter: Point,
    projectedGeoPerViewportScale: number,
    rotation = 0,
    devicePixelRatio = 1
  ) {
    this.projectedGeoCenter = projectedGeoCenter
    this.projectedGeoPerViewportScale = projectedGeoPerViewportScale
    this.rotation = rotation
    this.viewportSize = [
      Math.round(viewportSize[0]),
      Math.round(viewportSize[1])
    ] // Note: assure integer values for viewport size, so they can be stored in arrays
    this.devicePixelRatio = devicePixelRatio

    this.projectedGeoRectangle = this.computeProjectedGeoRectangle(
      this.viewportSize,
      this.projectedGeoPerViewportScale,
      this.rotation,
      this.projectedGeoCenter
    )
    this.projectedGeoRectangleBbox = computeBbox(this.projectedGeoRectangle)
    this.projectedGeoSize = scaleSize(
      this.viewportSize,
      projectedGeoPerViewportScale
    )
    this.projectedGeoResolution = sizeToResolution(this.projectedGeoSize)

    this.geoCenter = webMercatorToLonLat(this.projectedGeoCenter)
    // TODO: improve this with an interpolated back-projection, resulting in a ring
    this.geoRectangle = this.projectedGeoRectangle.map((point) => {
      return webMercatorToLonLat(point)
    }) as Rectangle
    this.geoRectangleBbox = computeBbox(this.geoRectangle)
    this.geoSize = bboxToSize(this.geoRectangleBbox)
    this.geoResolution = sizeToResolution(this.geoSize)

    this.viewportResolution = sizeToResolution(this.viewportSize)
    this.viewportCenter = sizeToCenter(this.viewportSize)
    this.viewportBbox = sizeToBbox(this.viewportSize)
    this.viewportRectangle = bboxToRectangle(this.viewportBbox)

    this.canvasCenter = scalePoint(this.viewportCenter, this.devicePixelRatio)
    this.canvasSize = scaleSize(this.viewportSize, this.devicePixelRatio)
    this.canvasResolution = sizeToResolution(this.canvasSize)
    this.canvasBbox = sizeToBbox(this.canvasSize)
    this.canvasRectangle = bboxToRectangle(this.canvasBbox)

    this.projectedGeoPerCanvasScale =
      this.projectedGeoPerViewportScale / this.devicePixelRatio

    this.projectedGeoToViewportTransform =
      this.composeProjectedGeoToViewportTransform()
    this.projectedGeoToCanvasTransform =
      this.composeProjectedGeoToCanvasTransform()
    this.projectedGeoToClipTransform = this.composeProjectedGeoToClipTransform()
    this.viewportToClipTransform = this.composeViewportToClipTransform()
  }

  /**
   * Static method that creates a Viewport from a size and maps.
   *
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param maps - A WarpedMapList or an array of WarpedMaps.
   * @param viewportOptions - Optional viewport options
   * @returns A new Viewport object.
   */
  static fromSizeAndMaps<W extends WarpedMap>(
    viewportSize: Size,
    maps: WarpedMapList<W> | WarpedMap[],
    viewportOptions?: Partial<ViewportOptions>
  ): Viewport {
    const projectedGeoConvexHull = this.mapsToProjectedGeoConvexHull(maps)

    return this.fromSizeAndPolygon(
      viewportSize,
      [projectedGeoConvexHull],
      viewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a size and a polygon.
   *
   * @static
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param projectedGeoPolygon - A polygon in projected geo coordinates.
   * @param viewportOptions - Optional viewport options
   * @returns A new Viewport object.
   */
  static fromSizeAndPolygon(
    viewportSize: Size,
    projectedGeoPolygon: Polygon,
    viewportOptions?: Partial<ViewportOptions>
  ): Viewport {
    const { fit, rotation, devicePixelRatio, zoom } = mergeOptions(
      defaultViewportOptions,
      viewportOptions
    )

    const projectedGeoRing = projectedGeoPolygon[0]
    const rotatedProjectedGeoRing = rotatePoints(projectedGeoRing, -rotation)
    const rotatedProjectedGeoBbox = computeBbox(rotatedProjectedGeoRing)
    const rotatedProjectedGeoSize = bboxToSize(rotatedProjectedGeoBbox)
    const rotatedProjectedGeoCenter = bboxToCenter(rotatedProjectedGeoBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      rotatedProjectedGeoSize,
      viewportSize,
      fit
    )

    const projectedGeoCenter = rotatePoint(rotatedProjectedGeoCenter, rotation)

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale * zoom,
      rotation,
      devicePixelRatio
    )
  }

  /**
   * Static method that creates a Viewport from a scale and maps.
   *
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projected coordinates per viewport pixel.
   * @param maps - A WarpedMapList or an array of WarpedMaps.
   * @param viewportOptions - Optional viewport options. Fit is ignored.
   * @returns A new Viewport object.
   */
  static fromScaleAndMaps<W extends WarpedMap>(
    projectedGeoPerViewportScale: number,
    maps: WarpedMapList<W> | WarpedMap[],
    viewportOptions?: Partial<ViewportOptions>
  ): Viewport {
    const projectedGeoConvexHull = this.mapsToProjectedGeoConvexHull(maps)

    return this.fromScaleAndPolygon(
      [projectedGeoConvexHull],
      projectedGeoPerViewportScale,
      viewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a scale and a polygon.
   *
   * @param projectedGeoPolygon - A polygon in projected geospatial coordinates.
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projected geo coordinates per viewport pixel.
   * @param viewportOptions - Optional viewport options. Fit is ignored.
   * @returns A new Viewport object.
   */
  static fromScaleAndPolygon(
    projectedGeoPolygon: Polygon,
    projectedGeoPerViewportScale: number,
    viewportOptions?: Partial<ViewportOptions>
  ): Viewport {
    const { rotation, devicePixelRatio, zoom } = mergeOptions(
      defaultViewportOptions,
      viewportOptions
    )

    const projectedGeoRing = projectedGeoPolygon[0]
    const viewportRing = scalePoints(
      rotatePoints(projectedGeoRing, -rotation),
      1 / projectedGeoPerViewportScale
    )
    const viewportBbox = computeBbox(viewportRing)
    const viewportSize = bboxToSize(viewportBbox)
    const viewportCenter = bboxToCenter(viewportBbox)
    const projectedGeoCenter = rotatePoint(
      scalePoint(viewportCenter, projectedGeoPerViewportScale),
      rotation
    )

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale * zoom,
      rotation,
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
      -1 / this.projectedGeoPerViewportScale, // '-' for handedness
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToCanvasTransform(): Transform {
    return composeTransform(
      this.canvasCenter[0],
      this.canvasCenter[1],
      1 / this.projectedGeoPerCanvasScale,
      -1 / this.projectedGeoPerCanvasScale, // '-' for handedness
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
      -2 / this.viewportSize[1], // '-' for handedness
      0,
      -this.viewportCenter[0],
      -this.viewportCenter[1]
    )
  }

  /**
   * Returns a rectangle in projected geo coordinates
   *
   * The rectangle is the result of a horizontal rectangle in Viewport space of size 'viewportSize',
   * scaled using projectedGeoPerViewportScale, centered,
   * rotated using 'rotation' and translated to 'projectedGeoCenter'.
   *
   * @private
   * @param viewportSize
   * @param projectedGeoPerViewportScale
   * @param rotation
   * @param projectedGeoCenter
   */
  private computeProjectedGeoRectangle(
    viewportSize: Size,
    projectedGeoPerViewportScale: number,
    rotation: number,
    projectedGeoCenter: Point
  ): Rectangle {
    const scaled = scaleSize(viewportSize, projectedGeoPerViewportScale)
    const rectangle = sizeToRectangle(scaled)
    const centered = translatePoints(
      rectangle,
      midPoint(...rectangle),
      'substract'
    ) as Rectangle
    const rotated = rotatePoints(centered, rotation) as Rectangle
    const translated = translatePoints(rotated, projectedGeoCenter) as Rectangle

    return translated
  }

  private static mapsToProjectedGeoConvexHull<W extends WarpedMap>(
    maps: WarpedMapList<W> | WarpedMap[]
  ): Ring {
    let projectedGeoConvexHull

    if (!Array.isArray(maps)) {
      projectedGeoConvexHull = maps.getProjectedConvexHull()
    } else {
      const maskPoints: Point[] = []

      for (const warpedMap of maps) {
        if (warpedMap.visible) {
          maskPoints.push(...warpedMap.projectedGeoMask)
        }
      }

      projectedGeoConvexHull = convexHull(maskPoints)
    }

    if (!projectedGeoConvexHull) {
      throw new Error(
        'Maps have no projected convex hull. Possibly because WarpedMapList or Array is empty.'
      )
    }

    return projectedGeoConvexHull
  }
}
