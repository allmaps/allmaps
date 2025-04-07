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
  mergeOptions
} from '@allmaps/stdlib'
import {
  lonLatProjection,
  webMercatorProjection,
  proj4
} from '@allmaps/project'

import {
  composeTransform,
  applyTransform,
  invertTransform
} from '../shared/matrix.js'
import { WarpedMapList } from '../maps/WarpedMapList.js'

import type {
  Point,
  Rectangle,
  Size,
  Bbox,
  Transform,
  Fit,
  Polygon
} from '@allmaps/types'

import type { Projection } from '@allmaps/project'

import type { WarpedMap } from '../maps/WarpedMap.js'
import type { ProjectionOptions, SelectionOptions } from '../shared/types.js'

export type ViewportOptions = {
  rotation: number
  devicePixelRatio: number
} & ProjectionOptions

export type ZoomOptions = {
  zoom: number
}

export type FitOptions = {
  fit: Fit
}

const defaultViewportOptions = {
  rotation: 0,
  devicePixelRatio: 1,
  projection: webMercatorProjection
} as ViewportOptions

const defaultZoomOptions = {
  zoom: 1
} as ZoomOptions

const defaultFitOptions = {
  fit: 'contain'
} as FitOptions

/**
 * The viewport describes the view on the rendered map.
 * @property geoCenter - Center point of the viewport, in longitude/latitude coordinates.
 * @property geoRectangle - Rotated rectangle (possibly quadrilateral) of the viewport point, in longitude/latitude coordinates.
 * @property geoSize - Size of the viewport in longitude/latitude coordinates, as [width, height]. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property geoResolution - Resolution of the viewport in longitude/latitude coordinates, as width * height. (This is the size of the bounding box of the rectangle, since longitude/latitude only makes sense in that case).
 * @property geoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in longitude/latitude coordinates.
 * @property projectedGeoCenter - Center point of the viewport, in projected geospatial coordinates.
 * @property projectedGeoRectangle - Rotated rectangle of the viewport point, in projected geospatial coordinates.
 * @property projectedGeoSize - Size of the viewport in projected geospatial coordinates, as [width, height]. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property projectedGeoResolution - Resolution of the viewport in projected geospatial coordinates, as width * height. (This is not the size of the bounding box of the rotated rectangle, but the width and hight of the rectangle).
 * @property projectedGeoRectangleBbox - Bounding box of the rotated rectangle of the viewport, in projected geospatial coordinates.
 * @property rotation - Rotation of the viewport with respect to the projected coordinate system.
 * @property projectedGeoPerViewportScale - Scale of the viewport, in projected geospatial coordinates per viewport pixel.
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
 * @property projectedGeoPerCanvasScale - Scale of the viewport, in projected geospatial coordinates per canvas pixel (projectedGeoPerViewportScale/devicePixelRatio).
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

  projection: Projection

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
   * @param projectedGeoCenter - Center point of the viewport, in projected geospatial coordinates.
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projection coordinates per viewport pixel.
   * @param rotation - Rotation of the viewport with respect to the projected geo coordinate system. Positive values rotate the viewport positively (i.e. counter-clockwise) w.r.t. the map in projected geospatial coordinates. This is equivalent to rotating the map negatively (i.e. clockwise) within the viewport.
   * @param devicePixelRatio - The devicePixelRatio of the viewport.
   * @param projection - The projection the projected coordinates are in .
   */
  constructor(
    viewportSize: Size,
    projectedGeoCenter: Point,
    projectedGeoPerViewportScale: number,
    partialViewportOptions?: Partial<ViewportOptions>
  ) {
    const viewportOptions = mergeOptions(
      defaultViewportOptions,
      partialViewportOptions
    )

    this.projectedGeoCenter = projectedGeoCenter
    this.projectedGeoPerViewportScale = projectedGeoPerViewportScale
    this.rotation = viewportOptions.rotation
    this.viewportSize = [
      Math.round(viewportSize[0]),
      Math.round(viewportSize[1])
    ] // Note: assure integer values for viewport size, so they can be stored in arrays
    this.devicePixelRatio = viewportOptions.devicePixelRatio

    this.projection = viewportOptions.projection

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

    // TODO: improve this with an interpolated back-projection, resulting in a ring
    this.geoRectangle = this.projectedGeoRectangle.map((point) => {
      return proj4(this.projection, lonLatProjection, point)
    }) as Rectangle
    this.geoRectangleBbox = computeBbox(this.geoRectangle)
    this.geoCenter = bboxToCenter(this.geoRectangleBbox)
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
   * Optionally specify a projection, to be used both when obtaining the extent of selected warped maps in projected geospatial coordinates, as well as when create a viewport
   *
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param warpedMapList - A WarpedMapList.
   * @param partialExtendedViewportOptions - Optional viewport options
   * @returns A new Viewport object.
   */
  static fromSizeAndMaps<W extends WarpedMap>(
    viewportSize: Size,
    warpedMapList: WarpedMapList<W>,
    partialExtendedViewportOptions?: Partial<
      ViewportOptions & ZoomOptions & FitOptions & SelectionOptions
    >
  ): Viewport {
    const projectedGeoConvexHull = warpedMapList.getMapsConvexHull(
      partialExtendedViewportOptions
    )

    if (!projectedGeoConvexHull) {
      throw new Error(
        'Maps have no projected convex hull. Possibly because WarpedMapList or Array is empty.'
      )
    }

    return this.fromSizeAndPolygon(
      viewportSize,
      [projectedGeoConvexHull],
      partialExtendedViewportOptions
    )
  }

  // /**
  //  * Static method that creates a Viewport from a size and a geo polygon.
  //  *
  //  * @static
  //  * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
  //  * @param geoPolygon - A polygon in geo coordinates.
  //  * @param partialExtendedViewportOptions - Optional viewport options
  //  * @returns A new Viewport object.
  //  */
  // static fromSizeAndGeoPolygon(
  //   viewportSize: Size,
  //   geoPolygon: Polygon,
  //   partialExtendedViewportOptions?: Partial<
  //     ViewportOptions & ZoomOptions & FitOptions
  //   >
  // ): Viewport {
  //   const extendedViewportOptions = mergeOptions(
  //     {
  //       ...defaultViewportOptions,
  //       ...defaultZoomOptions,
  //       ...defaultFitOptions
  //     },
  //     partialExtendedViewportOptions
  //   )

  //   const projectedGeoPolygon = geoPolygon.map((ring) =>
  //     ring.map((point) => proj4(extendedViewportOptions.projection, point))
  //   )

  //   return this.fromSizeAndPolygon(
  //     viewportSize,
  //     projectedGeoPolygon,
  //     partialExtendedViewportOptions
  //   )
  // }

  /**
   * Static method that creates a Viewport from a size and a polygon.
   *
   * @static
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param projectedGeoPolygon - A polygon in projected geospatial coordinates.
   * @param partialExtendedViewportOptions - Optional viewport options
   * @returns A new Viewport object.
   */
  static fromSizeAndPolygon(
    viewportSize: Size,
    projectedGeoPolygon: Polygon,
    partialExtendedViewportOptions?: Partial<
      ViewportOptions & ZoomOptions & FitOptions
    >
  ): Viewport {
    const extendedViewportOptions = mergeOptions(
      {
        ...defaultViewportOptions,
        ...defaultZoomOptions,
        ...defaultFitOptions
      },
      partialExtendedViewportOptions
    )

    const projectedGeoRing = projectedGeoPolygon[0]
    const rotatedProjectedGeoRing = rotatePoints(
      projectedGeoRing,
      -extendedViewportOptions.rotation
    )
    const rotatedProjectedGeoBbox = computeBbox(rotatedProjectedGeoRing)
    const rotatedProjectedGeoSize = bboxToSize(rotatedProjectedGeoBbox)
    const rotatedProjectedGeoCenter = bboxToCenter(rotatedProjectedGeoBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      rotatedProjectedGeoSize,
      viewportSize,
      extendedViewportOptions.fit
    )

    const projectedGeoCenter = rotatePoint(
      rotatedProjectedGeoCenter,
      extendedViewportOptions.rotation
    )

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale * extendedViewportOptions.zoom,
      extendedViewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a scale and maps.
   *
   * Optionally specify a projection, to be used both when obtaining the extent of selected warped maps in projected geospatial coordinates, as well as when create a viewport
   *
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projected geospatial coordinates per viewport pixel.
   * @param warpedMapList - A WarpedMapList.
   * @param partialExtendedViewportOptions - Optional viewport options.
   * @returns A new Viewport object.
   */
  static fromScaleAndMaps<W extends WarpedMap>(
    projectedGeoPerViewportScale: number,
    warpedMapList: WarpedMapList<W>,
    partialExtendedViewportOptions?: Partial<
      ViewportOptions & ZoomOptions & SelectionOptions
    >
  ): Viewport {
    const projectedGeoConvexHull = warpedMapList.getMapsConvexHull(
      partialExtendedViewportOptions
    )

    if (!projectedGeoConvexHull) {
      throw new Error(
        'Maps have no projected convex hull. Possibly because WarpedMapList or Array is empty.'
      )
    }

    return this.fromScaleAndPolygon(
      projectedGeoPerViewportScale,
      [projectedGeoConvexHull],
      partialExtendedViewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a scale and a polygon.
   *
   * @param projectedGeoPolygon - A polygon in projected geospatial coordinates.
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projected geospatial coordinates per viewport pixel.
   * @param partialViewportOptions - Optional viewport options.
   * @returns A new Viewport object.
   */
  static fromScaleAndPolygon(
    projectedGeoPerViewportScale: number,
    projectedGeoPolygon: Polygon,
    partialExtendedViewportOptions?: Partial<ViewportOptions & ZoomOptions>
  ): Viewport {
    const extendedViewportOptions = mergeOptions(
      {
        ...defaultViewportOptions,
        ...defaultZoomOptions
      },
      partialExtendedViewportOptions
    )

    const projectedGeoRing = projectedGeoPolygon[0]
    const viewportRing = scalePoints(
      rotatePoints(projectedGeoRing, -extendedViewportOptions.rotation),
      1 / projectedGeoPerViewportScale
    )
    const viewportBbox = computeBbox(viewportRing)
    const viewportSize = bboxToSize(viewportBbox)
    const viewportCenter = bboxToCenter(viewportBbox)
    const projectedGeoCenter = rotatePoint(
      scalePoint(viewportCenter, projectedGeoPerViewportScale),
      extendedViewportOptions.rotation
    )

    return new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale * extendedViewportOptions.zoom,
      extendedViewportOptions
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
   * Returns a rectangle in projected geospatial coordinates
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
}
