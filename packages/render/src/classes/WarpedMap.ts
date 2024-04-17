import { generateId } from '@allmaps/id'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import { triangulateToUnique } from '@allmaps/triangulate'
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

import { applyTransform } from '../shared/matrix.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type {
  Point,
  Gcp,
  Ring,
  Rectangle,
  Bbox,
  GeojsonPolygon,
  FetchFn,
  ImageInformations
} from '@allmaps/types'
import type {
  Helmert,
  TransformationType,
  PartialTransformOptions,
  DistortionMeasure
} from '@allmaps/transform'

import type Viewport from './Viewport.js'

// TODO: Consider making this tunable by the user.
const DIAMETER_FRACTION = 300
const TRANSFORMER_OPTIONS = {
  maxOffsetRatio: 0.05,
  maxDepth: 2,
  differentHandedness: true
} as PartialTransformOptions

const MAX_TRIANGULATE_ERROR_COUNT = 10

type WarpedMapOptions = {
  fetchFn: FetchFn
  // TODO: this option needs a better name:
  imageInformations: ImageInformations
  visible: boolean
}

const DEFAULT_VISIBLE = true

function createDefaultWarpedMapOptions(): Partial<WarpedMapOptions> {
  return {
    visible: DEFAULT_VISIBLE
  }
}

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
 * @param {Cache} [imageInfoCache] - Cache of the image info of this image
 * @param {string} [imageId] - ID of the image
 * @param {IIIFImage} [parsedImage] - ID of the image
 * @param {boolean} visible - Whether the map is visible
 * @param {TransformationType} transformationType - Transformation type used in the transfomer
 * @param {GcpTransformer} transformer - Transformer used for warping this map (resource to geo)
 * @param {GcpTransformer} projectedTransformer - Projected Transformer used for warping this map (resource to projectedGeo)
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
 * @param {DistortionMeasure} [distortionMeasure] - Distortion measure displayed for this map
 * @param {number} bestScaleFactor - The best tile scale factor for displaying this map, at the current viewport
 * @param {Ring} resourceViewportRing - The viewport transformed back to resource coordinates, at the current viewport
 * @param {Bbox} [resourceViewportRingBbox] - Bbox of the resourceViewportRing
 * @param {Point[]} resourceTrianglepoints - Triangle points of the triangles the triangulated resourceMask (at the current bestScaleFactor)
 * @param {Point[]} resourceUniquepoints - Unique points of the triangles the triangulated resourceMask (at the current bestScaleFactor)
 * @param {number[]} trianglePointsUniquePointsIndex - Index in resourceUniquepoints where a specific resourceTrianglepoint can be found
 * @param {number} triangulateErrorCount - Number of time the triangulation has resulted in an error
 * @param {Point[]} projectedGeoPreviousTrianglePoints - The projectedGeoTrianglePoints of the previous transformation type, used during transformation transitions
 * @param {Point[]} projectedGeoTrianglePoints - The resourceTrianglePoints in geo coordinates
 * @param {Point[]} projectedGeoUniquePoints - The resourceUniquePoints in geo coordinates
 * @param {Point[]} projectedGeoUniquePointsPartialDerivativeX - Partial Derivative to X at the projectedGeoUniquePoints
 * @param {Point[]} projectedGeoUniquePointsPartialDerivativeY - Partial Derivative to Y at the projectedGeoUniquePoints
 * @param {number[]} previousTrianglePointsDistortion - The trianglePointsDistortion of the previous transformation type, used during transformation transitions
 * @param {number[]} trianglePointsDistortion - Distortion amount of the distortionMeasure at the projectedGeoTrianglePoints
 * @param {number[]} uniquePointsDistortion - Distortion amount of the distortionMeasure at the projectedGeoUniquePoints
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

  imageInformations?: ImageInformations
  imageId?: string
  parsedImage?: IIIFImage
  loadingImageInfo: boolean

  fetchFn?: FetchFn

  visible: boolean

  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedTransformer!: GcpTransformer
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

  distortionMeasure?: DistortionMeasure

  // The properties below are for the current viewport

  bestScaleFactor!: number

  resourceViewportRing: Ring = []
  resourceViewportRingBbox?: Bbox

  // The properties below are at the current bestScaleFactor

  resourceTrianglePoints: Point[] = []
  resourceUniquePoints: Point[] = []
  trianglePointsUniquePointsIndex: number[] = []
  private triangulationByBestScaleFactor: Map<
    number,
    { trianglePointsUniquePointsIndex: number[]; resourceUniquePoints: Point[] }
  > = new Map()
  triangulateErrorCount = 0

  projectedGeoPreviousTrianglePoints: Point[] = []
  projectedGeoTrianglePoints: Point[] = []
  projectedGeoUniquePoints: Point[] = []
  private projectedGeoUniquePointsByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()

  projectedGeoUniquePointsPartialDerivativeX: Point[] = []
  projectedGeoUniquePointsPartialDerivativeY: Point[] = []
  private projectedGeoUniquePointsPartialDerivativeXByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()
  private projectedGeoUniquePointsPartialDerivativeYByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()

  previousTrianglePointsDistortion: number[] = []
  trianglePointsDistortion: number[] = []
  uniquePointsDistortion: number[] = []

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
    options: Partial<WarpedMapOptions>
  ) {
    super()

    options = {
      ...createDefaultWarpedMapOptions(),
      ...options
    }

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

    this.imageInformations = options.imageInformations
    this.loadingImageInfo = false

    this.visible = options.visible || DEFAULT_VISIBLE

    this.fetchFn = options.fetchFn

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
   * Get the reference scaling from the forward transformation of the projected Helmert transformer
   *
   * @returns {number}
   */
  getReferenceScaling(): number {
    const projectedHelmertTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerByTransformationType,
      'helmert',
      () =>
        new GcpTransformer(this.projectedGcps, 'helmert', TRANSFORMER_OPTIONS)
    )
    if (!projectedHelmertTransformer.forwardTransformation) {
      projectedHelmertTransformer.createForwardTransformation()
    }
    return (projectedHelmertTransformer.forwardTransformation as Helmert)
      .scale as number
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
    this.triangulationByBestScaleFactor = new Map()
    this.projectedGeoUniquePointsByBestScaleFactorAndTransformationType =
      new Map()
    this.projectedGeoUniquePointsPartialDerivativeXByBestScaleFactorAndTransformationType =
      new Map()
    this.projectedGeoUniquePointsPartialDerivativeYByBestScaleFactorAndTransformationType =
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
   * Set the distortionMeasure
   *
   * @param {DistortionMeasure} [distortionMeasure] - the disortion measure
   */
  setDistortionMeasure(distortionMeasure?: DistortionMeasure): void {
    this.distortionMeasure = distortionMeasure
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
    const { trianglePointsUniquePointsIndex, resourceUniquePoints } =
      getPropertyFromCacheOrComputation(
        this.triangulationByBestScaleFactor,
        this.bestScaleFactor,
        () => {
          const diameter =
            (geometryToDiameter(this.resourceMask) * this.bestScaleFactor) /
            DIAMETER_FRACTION

          // TODO: make this obsolete by cleaning mask using conformPolygon() in @allmaps/annotation or in WarpedMap constructor
          try {
            const { uniquePointsIndexTriangles, uniquePoints } =
              triangulateToUnique(this.resourceMask, diameter)

            return {
              trianglePointsUniquePointsIndex:
                uniquePointsIndexTriangles.flat(),
              resourceUniquePoints: uniquePoints
            }
          } catch (err) {
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
            return {
              trianglePointsUniquePointsIndex:
                this.trianglePointsUniquePointsIndex,
              resourceUniquePoints: this.resourceUniquePoints
            }
          }
        }
      )

    this.resourceTrianglePoints = trianglePointsUniquePointsIndex.map(
      (i) => resourceUniquePoints[i]
    )
    this.resourceUniquePoints = resourceUniquePoints as Point[]
    this.trianglePointsUniquePointsIndex =
      trianglePointsUniquePointsIndex as number[]

    this.updateProjectedGeoTrianglePoints(previousIsNew)
  }

  /**
   * Update the (previous and new) points of the triangulated resourceMask, at the current bestScaleFactor, in projectedGeo coordinates. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false]
   */
  updateProjectedGeoTrianglePoints(previousIsNew = false) {
    this.projectedGeoUniquePoints = getPropertyFromDoubleCacheOrComputation(
      this.projectedGeoUniquePointsByBestScaleFactorAndTransformationType,
      this.bestScaleFactor,
      this.transformationType,
      () =>
        this.resourceUniquePoints.map((point) =>
          this.projectedTransformer.transformToGeo(point)
        )
    )
    this.projectedGeoTrianglePoints = this.trianglePointsUniquePointsIndex.map(
      (i) => this.projectedGeoUniquePoints[i]
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

    this.projectedGeoUniquePointsPartialDerivativeX =
      getPropertyFromDoubleCacheOrComputation(
        this
          .projectedGeoUniquePointsPartialDerivativeXByBestScaleFactorAndTransformationType,
        this.bestScaleFactor,
        this.transformationType,
        () =>
          this.resourceUniquePoints.map((point) =>
            this.projectedTransformer.transformToGeo(point, {
              evaluationType: 'partialDerivativeX'
            })
          )
      )

    this.projectedGeoUniquePointsPartialDerivativeY =
      getPropertyFromDoubleCacheOrComputation(
        this
          .projectedGeoUniquePointsPartialDerivativeYByBestScaleFactorAndTransformationType,
        this.bestScaleFactor,
        this.transformationType,
        () =>
          this.resourceUniquePoints.map((point) =>
            this.projectedTransformer.transformToGeo(point, {
              evaluationType: 'partialDerivativeY'
            })
          )
      )

    this.uniquePointsDistortion = this.projectedGeoUniquePoints.map(
      (_point, index) =>
        computeDistortionFromPartialDerivatives(
          this.projectedGeoUniquePointsPartialDerivativeX[index],
          this.projectedGeoUniquePointsPartialDerivativeY[index],
          this.distortionMeasure!,
          this.getReferenceScaling()
        )
    )
    this.trianglePointsDistortion = this.trianglePointsUniquePointsIndex.map(
      (i) => this.uniquePointsDistortion[i]
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
    try {
      this.loadingImageInfo = true
      const imageUri = this.georeferencedMap.resource.id

      let imageInfo

      if (this.imageInformations?.get(imageUri)) {
        imageInfo = this.imageInformations.get(imageUri)
      } else {
        // TODO: don't force-cache here?
        imageInfo = await fetchImageInfo(
          imageUri,
          { cache: 'force-cache' },
          this.fetchFn
        )
        this.imageInformations?.set(imageUri, imageInfo)
      }

      this.parsedImage = IIIFImage.parse(imageInfo)
      this.imageId = await generateId(imageUri)

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    } catch (err) {
      this.loadingImageInfo = false
      throw err
    } finally {
      this.loadingImageInfo = false
    }
  }

  dispose() {
    // TODO: consider adding all heavy properties in here
  }

  private updateResourceMaskProperties() {
    this.resourceMaskBbox = computeBbox(this.resourceMask)
    this.resourceMaskRectangle = bboxToRectangle(this.resourceMaskBbox)
  }

  private updateTransformerProperties(useCache = true): void {
    this.updateTransformer(useCache)
    this.updateProjectedTransformer(useCache)
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
    options: Partial<WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)
  }
}
