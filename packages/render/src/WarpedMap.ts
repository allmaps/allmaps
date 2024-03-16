import { generateId } from '@allmaps/id'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import { triangulate } from '@allmaps/triangulate'
import { computeDistortionFromPartialDerivatives } from '@allmaps/transform'
import {
  computeBbox,
  bboxToRectangle,
  rectanglesToScale,
  geometryToDiameter,
  fetchImageInfo,
  lonLatToWebMecator,
  mixNumbers,
  mixPoints,
  getPropertyFromCacheOrComputation,
  getPropertyFromDoubleCacheOrComputation
} from '@allmaps/stdlib'

import { applyTransform } from './shared/matrix.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type {
  Point,
  Gcp,
  Ring,
  Rectangle,
  Bbox,
  GeojsonPolygon
} from '@allmaps/types'
import type {
  Helmert,
  TransformationType,
  PartialTransformOptions,
  DistortionMeasure
} from '@allmaps/transform'

import type Viewport from './Viewport.js'

// TODO: Consider making this tunable by the user.
const DIAMETER_FRACTION = 80
const TRANSFORMER_OPTIONS = {
  maxOffsetRatio: 0.05,
  maxDepth: 2,
  differentHandedness: true
} as PartialTransformOptions

const MAX_TRIANGULATE_ERROR_COUNT = 10

/**
 * Class for warped maps, which describe how a georeferenced map is warped using a specific transformation.
 *
 * @export
 * @class WarpedMap
 * @typedef {WarpedMap}
 * @extends {EventTarget}
 * @param {string} mapId - ID of the map
 * @param {GeoreferencedMap} georeferencedMap - Georeferende map this warped map is build on
 * @param {Gcp[]} gcps - Ground Controle Points used for warping this map (source to geo)
 * @param {Gcp[]} projectedGcps - Projected Ground Controle Points (source to projectedGeo)
 * @param {Ring} resourceMask - Resource mask
 * @param {Bbox} resourceMaskBbox - Bbox of the resourceMask
 * @param {Rectangle} resourceMaskRectangle - Rectangle of the resourceMaskBbox
 * @param {Ring} resourceFullMask - Resource full mask (describing the entire extent of the image)
 * @param {Bbox} resourceFullMaskBbox - Bbox of the resource full mask
 * @param {Rectangle} resourceFullMaskRectangle - Rectangle of the resource full mask bbox
 * @param {Cache} imageInfoCache - Cache of the image info of this image
 * @param {string} imageId - ID of the image
 * @param {IIIFImage} parsedImage - ID of the image
 * @param {boolean} visible - Whether the map is visible
 * @param {TransformationType} transformationType - Transformation type used in the transfomer
 * @param {GcpTransformer} transformer - Transformer used for warping this map (resource to geo)
 * @param {GcpTransformer} projectedTransformer - Projected Transformer used for warping this map (resource to projectedGeo)
 * @param {GcpTransformer} helmertTransformer - Helmert Transformer used for reference scaling (resource to geo)
 * @param {GcpTransformer} projectedHelmertTransformer - Projected Helmert Transformer used reference scaling (resource to projectedGeo)
 * @private {Map<TransformationType, GcpTransformer>} transformerByTransformationType - Cache of transformer by transformation type
 * @private {Map<TransformationType, GcpTransformer>} projecteTransformerByTransformationType - Cache of projected transformer by transformation type
 * @param {GeojsonPolygon} geoMask - resourceMask in geo coordinates
 * @param {Bbox} geoMaskBbox - Bbox of the geoMask
 * @param {Rectangle} geoMaskRectangle - resourceMaskRectangle in geo coordinates
 * @param {GeojsonPolygon} geoFullMask - resourceFullMask in geo coordinates
 * @param {Bbox} geoFullMaskBbox - Bbox of the geoFullMask
 * @param {Rectangle} geoFullMaskRectangle - resourceFullMaskRectangle in geo coordinates
 * @param {Ring} projectedGeoMask - resourceMask in projectedGeo coordinates
 * @param {Bbox} projectedGeoMaskBbox - Bbox of the projectedGeoMask
 * @param {Rectangle} projectedGeoMaskRectangle - resourceMaskRectanglee in projectedGeo coordinates
 * @param {Ring} projectedGeoFullMask - resourceFullMask in projectedGeo coordinates
 * @param {Bbox} projectedGeoFullMaskBbox - Bbox of the projectedGeoFullMask
 * @param {Rectangle} projectedGeoFullMaskRectangle - resourceFullMaskRectangle in projectedGeo coordinates
 * @param {number} resourceToProjectedGeoScale - Scale of the warped map, in resource pixels per projectedGeo coordinates
 * @param {DistortionMeasure | undefined} distortionMeasure - Distortion measure displayed for this map
 * @param {number} bestScaleFactor - The best tile scale factor for displaying this map, at the current viewport
 * @param {Ring} resourceViewportRing - The viewport transformed back to resource coordinates, at the current viewport
 * @param {Bbox} resourceViewportRingBbox - Bbox of the resourceViewportRing
 * @param {Point[]} resourceTrianglePoints - Points of the triangles the triangulated resourceMask (at the current bestScaleFactor)
 * @private {Map<number, Point[]>} resourceTrianglePointsByBestScaleFactor - Cache of the pointes of the triangles of the triangulated resourceMask by bestScaleFactor
 * @param {number} triangulateErrorCount - Number of time the triangulation has resulted in an error
 * @param {Point[]} projectedGeoPreviousTrianglePoints - Previous points of the triangles of the triangulated resourceMask (at the current bestScaleFactor) in projectedGeo coordinates
 * @param {Point[]} projectedGeoTrianglePoints - New (during transformation transition) points of the triangles of the triangulated resourceMask (at the current bestScaleFactor) in projectedGeo coordinate
 * @private {Map<number, Map<TransformationType, Point[]>>} projectedGeoTrianglePointsByBestScaleFactorAndTransformationType - Cache of the pointes of the triangles of the triangulated resourceMask in projectedGeo coordinates by bestScaleFactor and transformationType
 */
export default class WarpedMap extends EventTarget {
  mapId: string
  georeferencedMap: GeoreferencedMap

  gcps: Gcp[]
  projectedGcps: Gcp[]

  resourceMask: Ring
  resourceMaskBbox!: Bbox
  resourceMaskRectangle!: Rectangle
  resourceFullMask: Ring
  resourceFullMaskBbox: Bbox
  resourceFullMaskRectangle: Rectangle

  imageInfoCache?: Cache
  imageId?: string
  parsedImage?: IIIFImage
  loadingImageInfo: boolean

  visible: boolean

  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedTransformer!: GcpTransformer
  helmertTransformer!: GcpTransformer
  projectedHelmertTransformer!: GcpTransformer
  private transformerByTransformationType: Map<
    TransformationType,
    GcpTransformer
  > = new Map()
  private projectedTransformerByTransformationType: Map<
    TransformationType,
    GcpTransformer
  > = new Map()

  geoMask!: GeojsonPolygon
  geoMaskBbox!: Bbox
  geoMaskRectangle!: Rectangle
  geoFullMask!: GeojsonPolygon
  geoFullMaskBbox!: Bbox
  geoFullMaskRectangle!: Rectangle

  projectedGeoMask!: Ring
  projectedGeoMaskBbox!: Bbox
  projectedGeoMaskRectangle!: Rectangle
  projectedGeoFullMask!: Ring
  projectedGeoFullMaskBbox!: Bbox
  projectedGeoFullMaskRectangle!: Rectangle

  resourceToProjectedGeoScale!: number

  distortionMeasure: DistortionMeasure | undefined = 'twoOmega'

  // The properties below are for the current viewport

  bestScaleFactor!: number

  resourceViewportRing: Ring = [] // At current viewport
  resourceViewportRingBbox?: Bbox

  // The properties below are at the current bestScaleFactor

  resourceTrianglePoints: Point[] = []
  private resourceTrianglePointsByBestScaleFactor: Map<number, Point[]> =
    new Map()
  triangulateErrorCount = 0

  projectedGeoPreviousTrianglePoints: Point[] = []
  projectedGeoTrianglePoints: Point[] = []
  private projectedGeoTrianglePointsByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()

  projectedGeoPreviousTrianglePointsPartialDerivativeX: Point[] = []
  projectedGeoPreviousTrianglePointsPartialDerivativeY: Point[] = []
  projectedGeoTrianglePointsPartialDerivativeX: Point[] = []
  projectedGeoTrianglePointsPartialDerivativeY: Point[] = []
  private projectedGeoTrianglePointsPartialDerivativeXByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()
  private projectedGeoTrianglePointsPartialDerivativeYByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()

  previousTrianglePointsDistortion: number[] = []
  trianglePointsDistortion: number[] = []

  /**
   * Creates an instance of WarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferende map this warped map is build on
   * @param {?Cache} [imageInfoCache] - Cache of the image info of this image
   * @param {boolean} [visible=true] - Whether the map is visible
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    imageInfoCache?: Cache,
    visible = true
  ) {
    super()

    this.mapId = mapId
    this.georeferencedMap = georeferencedMap

    this.gcps = this.georeferencedMap.gcps
    this.projectedGcps = this.gcps.map(({ resource, geo }) => ({
      resource,
      geo: lonLatToWebMecator(geo)
    }))

    this.resourceMask = this.georeferencedMap.resourceMask
    this.updateResourceMaskProperties()

    this.resourceFullMask = [
      [0, 0],
      [this.georeferencedMap.resource.width, 0],
      [
        this.georeferencedMap.resource.width,
        this.georeferencedMap.resource.height
      ],
      [0, this.georeferencedMap.resource.height]
    ]
    this.resourceFullMaskBbox = computeBbox(this.resourceFullMask)
    this.resourceFullMaskRectangle = bboxToRectangle(this.resourceFullMaskBbox)

    this.imageInfoCache = imageInfoCache
    this.loadingImageInfo = false

    this.visible = visible

    this.transformationType =
      this.georeferencedMap.transformation?.type || 'polynomial'
    this.updateTransformerProperties()
  }

  /**
   * Get resourceMask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Ring}
   */
  getViewportMask(viewport: Viewport): Ring {
    return this.projectedGeoMask.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  /**
   * Get bbox of resourceMask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Bbox}
   */
  getViewportMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportMask(viewport))
  }

  /**
   * Get resourceMaskRectangle in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Rectangle}
   */
  getViewportMaskRectangle(viewport: Viewport): Rectangle {
    return this.projectedGeoMaskRectangle.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    }) as Rectangle
  }

  /**
   * Get resourceFullMask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Ring}
   */
  getViewportFullMask(viewport: Viewport): Ring {
    return this.projectedGeoFullMask.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  /**
   * Get bbox of rresourceFullMask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Bbox}
   */
  getViewportFullMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportFullMask(viewport))
  }

  /**
   * Get resourceFullMaskRectangle in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Rectangle}
   */
  getViewportFullMaskRectangle(viewport: Viewport): Rectangle {
    return this.projectedGeoFullMaskRectangle.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    }) as Rectangle
  }

  /**
   * Get scale of the warped map, in resource pixels per viewport pixels.
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {number}
   */
  getResourceToViewportScale(viewport: Viewport): number {
    return rectanglesToScale(
      this.resourceMaskRectangle,
      this.getViewportMaskRectangle(viewport)
    )
  }

  /**
   * Get scale of the warped map, in resource pixels per canvas pixels.
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {number}
   */
  getResourceToCanvasScale(viewport: Viewport): number {
    return this.getResourceToViewportScale(viewport) / viewport.devicePixelRatio
  }

  /**
   * Set resourceViewportRing at current viewport
   *
   * @param {Ring} resourceViewportRing
   */
  setResourceViewportRing(resourceViewportRing: Ring): void {
    this.resourceViewportRing = resourceViewportRing
    this.resourceViewportRingBbox = computeBbox(resourceViewportRing)
  }

  /**
   * Update the resourceMask loaded from a georeferenced map to a new mask.
   *
   * @param {Ring} resourceMask
   */
  setResourceMask(resourceMask: Ring): void {
    this.resourceMask = resourceMask
    this.updateResourceMaskProperties()
    this.updateGeoMask()
    this.updateProjectedGeoMask()
    this.updateResourceToProjectedGeoScale()
    this.resourceTrianglePointsByBestScaleFactor = new Map()
    this.projectedGeoTrianglePointsByBestScaleFactorAndTransformationType =
      new Map()
    this.updateTriangulation()
  }

  /**
   * Update the transformationType loaded from a georeferenced map to a new transformation type.
   *
   * @param {TransformationType} transformationType
   */
  setTransformationType(transformationType: TransformationType): void {
    this.transformationType = transformationType
    this.updateTransformerProperties()
  }

  /**
   * Update the Ground Controle Points loaded from a georeferenced map to new Ground Controle Points.
   *
   * @param {GCP[]} gcps
   */
  setGcps(gcps: Gcp[]): void {
    this.gcps = gcps
    this.updateTransformerProperties(false)
  }

  /**
   * Set the bestScaleFactor at the current viewport
   *
   * @param {number} scaleFactor - scale factor
   * @returns {boolean}
   */
  setBestScaleFactor(scaleFactor: number): void {
    if (this.bestScaleFactor != scaleFactor) {
      this.bestScaleFactor = scaleFactor
      this.updateTriangulation(true)
    }
  }

  /**
   * Update the triangulation of the resourceMask, at the current bestScaleFactor. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false] - whether the previous and new triangulation are the same - true by default, false during a transformation transition
   */
  updateTriangulation(previousIsNew = false) {
    if (
      this.resourceTrianglePointsByBestScaleFactor.has(this.bestScaleFactor)
    ) {
      this.resourceTrianglePoints =
        this.resourceTrianglePointsByBestScaleFactor.get(
          this.bestScaleFactor
        ) as Point[]
    } else {
      const diameter =
        (geometryToDiameter(this.resourceMask) * this.bestScaleFactor) /
        DIAMETER_FRACTION

      try {
        this.resourceTrianglePoints = triangulate(
          this.resourceMask,
          diameter
        ).flat()
      } catch (err) {
        this.logTriangulateError(err)
      }

      this.resourceTrianglePointsByBestScaleFactor.set(
        this.bestScaleFactor,
        this.resourceTrianglePoints
      )
    }

    this.updateProjectedGeoTrianglePoints(previousIsNew)
  }

  private logTriangulateError(err: unknown) {
    this.triangulateErrorCount++

    if (this.triangulateErrorCount <= MAX_TRIANGULATE_ERROR_COUNT) {
      // TODO: use function to get Allmaps Editor URL
      console.error(
        `Error computing triangulation for map ${this.mapId}.`,
        `Fix this map with Allmaps Editor: https://editor.allmaps.org/#/collection?url=${this.parsedImage?.uri}/info.json`
      )

      if (this.triangulateErrorCount === 1) {
        console.error(err)
      }
    }
  }

  /**
   * Update the (previous and new) points of the triangulated resourceMask, at the current bestScaleFactor, in projectedGeo coordinates. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false]
   */
  updateProjectedGeoTrianglePoints(previousIsNew = false) {
    this.projectedGeoTrianglePoints = getPropertyFromDoubleCacheOrComputation(
      this.projectedGeoTrianglePointsByBestScaleFactorAndTransformationType,
      this.bestScaleFactor,
      this.transformationType,
      () =>
        this.resourceTrianglePoints.map((point) =>
          this.projectedTransformer.transformToGeo(point)
        )
    )
    if (previousIsNew || !this.projectedGeoPreviousTrianglePoints.length) {
      this.projectedGeoPreviousTrianglePoints = this.projectedGeoTrianglePoints
    }

    this.updateTrianglePointsDistortion(previousIsNew)
  }

  /**
   * Update the (previous and new) distortion at the points of the triangulated resourceMask. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false]
   */
  updateTrianglePointsDistortion(previousIsNew = false) {
    if (!this.distortionMeasure) {
      return
    }

    this.projectedGeoTrianglePointsPartialDerivativeX =
      getPropertyFromDoubleCacheOrComputation(
        this
          .projectedGeoTrianglePointsPartialDerivativeXByBestScaleFactorAndTransformationType,
        this.bestScaleFactor,
        this.transformationType,
        () =>
          this.resourceTrianglePoints.map((point) =>
            this.projectedTransformer.transformToGeo(point, {
              evaluationType: 'partialDerivativeX'
            })
          )
      )
    if (
      previousIsNew ||
      !this.projectedGeoPreviousTrianglePointsPartialDerivativeX.length
    ) {
      this.projectedGeoPreviousTrianglePointsPartialDerivativeX =
        this.projectedGeoTrianglePointsPartialDerivativeX
    }

    this.projectedGeoTrianglePointsPartialDerivativeY =
      getPropertyFromDoubleCacheOrComputation(
        this
          .projectedGeoTrianglePointsPartialDerivativeYByBestScaleFactorAndTransformationType,
        this.bestScaleFactor,
        this.transformationType,
        () =>
          this.resourceTrianglePoints.map((point) =>
            this.projectedTransformer.transformToGeo(point, {
              evaluationType: 'partialDerivativeY'
            })
          )
      )

    if (
      previousIsNew ||
      !this.projectedGeoPreviousTrianglePointsPartialDerivativeY.length
    ) {
      this.projectedGeoPreviousTrianglePointsPartialDerivativeY =
        this.projectedGeoTrianglePointsPartialDerivativeY
    }

    this.trianglePointsDistortion = this.projectedGeoTrianglePoints.map(
      (_point, index) =>
        computeDistortionFromPartialDerivatives(
          this.projectedGeoTrianglePointsPartialDerivativeX[index],
          this.projectedGeoTrianglePointsPartialDerivativeY[index],
          this.distortionMeasure
        )
    )
    if (previousIsNew || !this.previousTrianglePointsDistortion.length) {
      this.previousTrianglePointsDistortion = this.trianglePointsDistortion
    }
  }

  /**
   * Reset the previous points of the triangulated resourceMask in projectedGeo coordinates.
   */
  resetTrianglePoints() {
    this.projectedGeoPreviousTrianglePoints = this.projectedGeoTrianglePoints
    this.previousTrianglePointsDistortion = this.trianglePointsDistortion
  }

  /**
   * Mix the previous and new points of the triangulated resourceMask in projectedGeo coordinates
   *
   * @param {number} t
   */
  mixTrianglePoints(t: number) {
    this.projectedGeoPreviousTrianglePoints =
      this.projectedGeoTrianglePoints.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoPreviousTrianglePoints[index],
          t
        )
      })
    this.previousTrianglePointsDistortion = this.trianglePointsDistortion.map(
      (distortion, index) => {
        return mixNumbers(
          distortion,
          this.previousTrianglePointsDistortion[index],
          t
        )
      }
    )
  }

  /**
   * Check if warpedMap has image info
   *
   * @returns {this is WarpedMapWithImageInfo}
   */
  hasImageInfo(): this is WarpedMapWithImageInfo {
    return this.imageId !== undefined && this.parsedImage !== undefined
  }

  /**
   * Fetch and parse the image info, and generate the image ID
   *
   * @async
   * @returns {Promise<void>}
   */
  async loadImageInfo(): Promise<void> {
    this.loadingImageInfo = true
    const imageUri = this.georeferencedMap.resource.id
    const imageInfoJson = await fetchImageInfo(imageUri, {
      cache: this.imageInfoCache
    })
    this.parsedImage = IIIFImage.parse(imageInfoJson)
    this.imageId = await generateId(imageUri)
    this.loadingImageInfo = false

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
  }

  dispose() {
    this.resourceTrianglePoints = []
    this.projectedGeoPreviousTrianglePoints = []
    this.projectedGeoTrianglePoints = []
  }

  private updateResourceMaskProperties() {
    this.resourceMaskBbox = computeBbox(this.resourceMask)
    this.resourceMaskRectangle = bboxToRectangle(this.resourceMaskBbox)
  }

  private updateTransformerProperties(useCache = true): void {
    this.updateTransformer(useCache)
    this.updateProjectedTransformer(useCache)
    this.updateHelmertTransformer(useCache)
    this.updateProjectedHelmertTransformer(useCache)
    this.updateGeoMask()
    this.updateFullGeoMask()
    this.updateProjectedGeoMask()
    this.updateProjectedFullGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  private updateTransformer(useCache = true): void {
    this.transformer = getPropertyFromCacheOrComputation(
      this.transformerByTransformationType,
      this.transformationType,
      () =>
        new GcpTransformer(
          this.gcps,
          this.transformationType,
          TRANSFORMER_OPTIONS
        ),
      useCache
    )
  }

  private updateProjectedTransformer(useCache = true): void {
    this.projectedTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerByTransformationType,
      this.transformationType,
      () =>
        new GcpTransformer(
          this.projectedGcps,
          this.transformationType,
          TRANSFORMER_OPTIONS
        ),
      useCache
    )
  }

  private updateHelmertTransformer(useCache = true): void {
    this.helmertTransformer = getPropertyFromCacheOrComputation(
      this.transformerByTransformationType,
      'helmert',
      () => new GcpTransformer(this.gcps, 'helmert', TRANSFORMER_OPTIONS),
      useCache
    )
    this.helmertTransformer.createForwardTransformation()
  }

  private updateProjectedHelmertTransformer(useCache = true): void {
    this.projectedHelmertTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerByTransformationType,
      'helmert',
      () =>
        new GcpTransformer(this.projectedGcps, 'helmert', TRANSFORMER_OPTIONS),
      useCache
    )
    this.projectedHelmertTransformer.createForwardTransformation()
    console.log(
      'scale of forward Helmert transform',
      (this.projectedHelmertTransformer.forwardTransformation as Helmert)?.scale
    )
  }

  private updateGeoMask(): void {
    this.geoMask = this.transformer.transformForwardAsGeojson([
      this.resourceMask
    ])
    this.geoMaskBbox = computeBbox(this.geoMask)
    this.geoMaskRectangle = this.transformer.transformForward(
      [this.resourceMaskRectangle],
      { maxDepth: 0 }
    )[0] as Rectangle
  }

  private updateFullGeoMask(): void {
    this.geoFullMask = this.transformer.transformForwardAsGeojson([
      this.resourceFullMask
    ])
    this.geoFullMaskBbox = computeBbox(this.geoFullMask)
    this.geoFullMaskRectangle = this.transformer.transformForward(
      [this.resourceFullMaskRectangle],
      { maxDepth: 0 }
    )[0] as Rectangle
  }

  private updateProjectedGeoMask(): void {
    this.projectedGeoMask = this.projectedTransformer.transformForward([
      this.resourceMask
    ])[0]
    this.projectedGeoMaskBbox = computeBbox(this.projectedGeoMask)
    this.projectedGeoMaskRectangle = this.projectedTransformer.transformForward(
      [this.resourceMaskRectangle]
    )[0] as Rectangle
  }

  private updateProjectedFullGeoMask(): void {
    this.projectedGeoFullMask = this.projectedTransformer.transformForward([
      this.resourceFullMask
    ])[0]
    this.projectedGeoFullMaskBbox = computeBbox(this.projectedGeoFullMask)
    this.projectedGeoFullMaskRectangle =
      this.projectedTransformer.transformForward([
        this.resourceFullMaskRectangle
      ])[0] as Rectangle
  }

  private updateResourceToProjectedGeoScale(): void {
    this.resourceToProjectedGeoScale = rectanglesToScale(
      this.resourceMaskRectangle,
      this.projectedGeoMaskRectangle
    )
  }
}

/**
 * Class for warped maps with image ID and parsed IIIF image.
 *
 * @export
 * @class WarpedMapWithImageInfo
 * @typedef {WarpedMapWithImageInfo}
 * @extends {WarpedMap}
 */
export class WarpedMapWithImageInfo extends WarpedMap {
  imageId!: string
  parsedImage!: IIIFImage
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    imageInfoCache?: Cache,
    visible = true
  ) {
    super(mapId, georeferencedMap, imageInfoCache, visible)
  }
}
