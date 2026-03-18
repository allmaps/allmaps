import proj4 from 'proj4'

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
  mergePartialOptions
} from '@allmaps/stdlib'
import { lonLatProjection, webMercatorProjection } from '@allmaps/project'

import {
  composeHomogeneousTransform,
  applyHomogeneousTransform,
  invertHomogeneousTransform
} from '../shared/homogeneous-transform.js'
import { WarpedMapList } from '../maps/WarpedMapList.js'

import type {
  Point,
  Rectangle,
  Size,
  Bbox,
  HomogeneousTransform,
  Fit,
  Polygon
} from '@allmaps/types'

import type { Projection } from '@allmaps/project'

import type { WarpedMap } from '../maps/WarpedMap.js'
import type { ProjectionOptions, SelectionOptions } from '../shared/types.js'

import { HALF_SIZE } from '../shared/web-mercator.js'

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
 * @property projectedGeoToViewportHomogeneousTransform - Homogeneous Transform from projected geo coordinates to viewport pixels. Equivalent to OpenLayers coordinateToPixelTransform.
 * @property projectedGeoToCanvasHomogeneousTransform - Homogeneous Transform from projected geo coordinates to canvas pixels.
 * @property projectedGeoToClipHomogeneousTransform - Homogeneous Transform from projected geo coordinates to WebGL coordinates in the [-1, 1] range. Equivalent to OpenLayers projectionTransform.
 * @property viewportToClipHomogeneousTransform - Homogeneous Transform from viewport coordinates to WebGL coordinates in the [-1, 1] range.
 * @property viewportToProjectedGeoHomogeneousTransform - Homogeneous Transform from viewport pixels to projected geospatial coordinates. Inverse of projectedGeoToViewportHomogeneousTransform.
 * @property startWorld - Index of the first world copy to render, for anti-meridian wrapping (0 = primary world).
 * @property endWorld - Index past the last world copy to render (exclusive), for anti-meridian wrapping.
 * @property worldWidth - Width of one world in projected geospatial coordinates. 0 for non-wrapping projections.
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
  projectedGeoToViewportHomogeneousTransform: HomogeneousTransform = [
    1, 0, 0, 1, 0, 0
  ]
  projectedGeoToCanvasHomogeneousTransform: HomogeneousTransform = [
    1, 0, 0, 1, 0, 0
  ]
  projectedGeoToClipHomogeneousTransform: HomogeneousTransform = [
    1, 0, 0, 1, 0, 0
  ]
  viewportToProjectedGeoHomogeneousTransform: HomogeneousTransform = [1, 0, 0, 1, 0, 0]
  viewportToClipHomogeneousTransform: HomogeneousTransform = [1, 0, 0, 1, 0, 0]

  startWorld: number
  endWorld: number
  worldWidth: number

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

    const canWrapX = typeof this.projection.definition === 'string' &&
      this.projection.definition.includes('+proj=merc')

    if (canWrapX) {
      this.worldWidth = 2 * HALF_SIZE
      this.startWorld = Math.floor(
        (this.projectedGeoRectangleBbox[0] - (-HALF_SIZE)) / this.worldWidth
      )
      this.endWorld = Math.ceil(
        (this.projectedGeoRectangleBbox[2] - HALF_SIZE) / this.worldWidth
      ) + 1
    } else {
      this.worldWidth = 0
      this.startWorld = 0
      this.endWorld = 1
    }

    // TODO: improve this with an interpolated back-projection, resulting in a ring
    const [a, b, c, d] = this.projectedGeoRectangle
    this.geoRectangle = [
      this.projectedGeoPointToGeoPoint(a),
      this.projectedGeoPointToGeoPoint(b),
      this.projectedGeoPointToGeoPoint(c),
      this.projectedGeoPointToGeoPoint(d)
    ]
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

    this.projectedGeoToViewportHomogeneousTransform =
      this.composeProjectedGeoToViewportHomogeneousTransform()
    this.viewportToProjectedGeoHomogeneousTransform =
      invertHomogeneousTransform(this.projectedGeoToViewportHomogeneousTransform)
    this.projectedGeoToCanvasHomogeneousTransform =
      this.composeProjectedGeoToCanvasHomogeneousTransform()
    this.projectedGeoToClipHomogeneousTransform =
      this.composeProjectedGeoToClipHomogeneousTransform()
    this.viewportToClipHomogeneousTransform =
      this.composeViewportToClipHomogeneousTransform()

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
      mergePartialOptions(partialExtendedViewportOptions, {
        projection: webMercatorProjection
      })
    )

    if (!projectedGeoConvexHull) {
      throw new Error(
        'Maps have no projected convex hull. Possibly because WarpedMapList or Array is empty.'
      )
    }

    return this.fromSizeAndProjectedGeoPolygon(
      viewportSize,
      [projectedGeoConvexHull],
      partialExtendedViewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a size and a polygon in geospatial coordinates, i.e. lon-lat `EPSG:4326`.
   *
   * @static
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param geoPolygon - A polygon in geospatial coordinates.
   * @param partialExtendedViewportOptions - Optional viewport options
   * @returns A new Viewport object.
   */
  static fromSizeAndGeoPolygon(
    viewportSize: Size,
    geoPolygon: Polygon,
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

    const projectedGeoPolygon = geoPolygon.map((ring) =>
      ring.map((point) =>
        proj4(extendedViewportOptions.projection.definition, point)
      )
    )

    return this.fromSizeAndProjectedGeoPolygon(
      viewportSize,
      projectedGeoPolygon,
      partialExtendedViewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a size and a polygon in projected geospatial coordinates.
   *
   * @static
   * @param viewportSize - Size of the viewport in viewport pixels, as [width, height].
   * @param projectedGeoPolygon - A polygon in projected geospatial coordinates.
   * @param partialExtendedViewportOptions - Optional viewport options
   * @returns A new Viewport object.
   */
  static fromSizeAndProjectedGeoPolygon(
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
    const projectedGeoRotatedRing = rotatePoints(
      projectedGeoRing,
      -extendedViewportOptions.rotation
    )
    const projectedGeoRotatedBbox = computeBbox(projectedGeoRotatedRing)
    const projectedGeoRotatedSize = bboxToSize(projectedGeoRotatedBbox)
    const projectedGeoRotatedCenter = bboxToCenter(projectedGeoRotatedBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      projectedGeoRotatedSize,
      viewportSize,
      extendedViewportOptions.fit
    )

    const projectedGeoCenter = rotatePoint(
      projectedGeoRotatedCenter,
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
      mergePartialOptions(partialExtendedViewportOptions, {
        projection: webMercatorProjection
      })
    )

    if (!projectedGeoConvexHull) {
      throw new Error(
        'Maps have no projected convex hull. Possibly because WarpedMapList or Array is empty.'
      )
    }

    return this.fromScaleAndProjectedGeoPolygon(
      projectedGeoPerViewportScale,
      [projectedGeoConvexHull],
      partialExtendedViewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a scale and a polygon in geospatial coordinates, i.e. lon-lat `EPSG:4326`.
   *
   * Note: the scale is still in *projected* geospatial per viewport pixel!
   *
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projected geospatial coordinates per viewport pixel.
   * @param geoPolygon - A polygon in geospatial coordinates.
   * @param partialViewportOptions - Optional viewport options.
   * @returns A new Viewport object.
   */
  static fromScaleAndGeoPolygon(
    projectedGeoPerViewportScale: number,
    geoPolygon: Polygon,
    partialExtendedViewportOptions?: Partial<ViewportOptions & ZoomOptions>
  ): Viewport {
    const extendedViewportOptions = mergeOptions(
      {
        ...defaultViewportOptions,
        ...defaultZoomOptions,
        ...defaultFitOptions
      },
      partialExtendedViewportOptions
    )

    const projectedGeoPolygon = geoPolygon.map((ring) =>
      ring.map((point) =>
        proj4(extendedViewportOptions.projection.definition, point)
      )
    )

    return this.fromScaleAndProjectedGeoPolygon(
      projectedGeoPerViewportScale,
      projectedGeoPolygon,
      partialExtendedViewportOptions
    )
  }

  /**
   * Static method that creates a Viewport from a scale and a polygon in projected geospatial coordinates.
   *
   * @param projectedGeoPerViewportScale - Scale of the viewport, in projected geospatial coordinates per viewport pixel.
   * @param projectedGeoPolygon - A polygon in projected geospatial coordinates.
   * @param partialViewportOptions - Optional viewport options.
   * @returns A new Viewport object.
   */
  static fromScaleAndProjectedGeoPolygon(
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

  getProjectedGeoBufferedRectangle(bufferFraction?: number): Rectangle {
    const bufferedBbox = bufferBboxByRatio(this.viewportBbox, bufferFraction ?? 0);
    const [bl, br, tr, tl] = bboxToRectangle(bufferedBbox);

    const transform = this.viewportToProjectedGeoHomogeneousTransform;

    return [
      this.wrapProjectedGeoPoint(applyHomogeneousTransform(transform, bl)),
      this.wrapProjectedGeoPoint(applyHomogeneousTransform(transform, br)),
      this.wrapProjectedGeoPoint(applyHomogeneousTransform(transform, tr)),
      this.wrapProjectedGeoPoint(applyHomogeneousTransform(transform, tl)),
    ];
  }

  getGeoBufferedRectangle(bufferFraction?: number): Rectangle {
    const [a, b, c, d] = this.getProjectedGeoBufferedRectangle(bufferFraction)
    return [
      this.projectedGeoPointToGeoPoint(a),
      this.projectedGeoPointToGeoPoint(b),
      this.projectedGeoPointToGeoPoint(c),
      this.projectedGeoPointToGeoPoint(d)
    ]
  }

  private composeProjectedGeoToViewportHomogeneousTransform(): HomogeneousTransform {
    return composeHomogeneousTransform(
      this.viewportCenter[0],
      this.viewportCenter[1],
      1 / this.projectedGeoPerViewportScale,
      -1 / this.projectedGeoPerViewportScale, // '-' for handedness
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToCanvasHomogeneousTransform(): HomogeneousTransform {
    return composeHomogeneousTransform(
      this.canvasCenter[0],
      this.canvasCenter[1],
      1 / this.projectedGeoPerCanvasScale,
      -1 / this.projectedGeoPerCanvasScale, // '-' for handedness
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeProjectedGeoToClipHomogeneousTransform(): HomogeneousTransform {
    return composeHomogeneousTransform(
      0,
      0,
      2 / (this.projectedGeoPerViewportScale * this.viewportSize[0]),
      2 / (this.projectedGeoPerViewportScale * this.viewportSize[1]),
      -this.rotation,
      -this.projectedGeoCenter[0],
      -this.projectedGeoCenter[1]
    )
  }

  private composeViewportToClipHomogeneousTransform(): HomogeneousTransform {
    return composeHomogeneousTransform(
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
   * Wraps a projected geo point's X coordinate into the primary world [-HALF_SIZE, HALF_SIZE].
   * This ensures proj4 inverse projection produces valid longitude values.
   *
   * @param point - A point in projected geospatial coordinates
   * @returns The point with X coordinate wrapped into [-HALF_SIZE, HALF_SIZE]
   */
  private wrapProjectedGeoPoint([x, y]: Point): Point {
    if (this.worldWidth === 0) {
      return [x, y]
    }
    const distanceFromLeftEdge = x - (-HALF_SIZE)
    const worldsCrossed = Math.floor(distanceFromLeftEdge / this.worldWidth)

    return [x - worldsCrossed * this.worldWidth, y]
  }

  /**
   * Converts a point in projected geospatial coordinates to longitude/latitude coordinates.
   * The point's X coordinate is first wrapped into the primary world before inverse projection.
   *
   * @param point - A point in projected geospatial coordinates.
   * @returns The point in longitude/latitude coordinates.
   */
  private projectedGeoPointToGeoPoint(point: Point): Point {
    return proj4(
      this.projection.definition,
      lonLatProjection.definition,
      this.wrapProjectedGeoPoint(point)
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
