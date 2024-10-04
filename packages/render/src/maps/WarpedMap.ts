import { generateId } from '@allmaps/id'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import {
  computeBbox,
  bboxToRectangle,
  rectanglesToScale,
  fetchImageInfo,
  lonLatToWebMecator,
  getPropertyFromCacheOrComputation,
  mixPoints
} from '@allmaps/stdlib'

import { applyTransform } from '../shared/matrix.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { WarpedMapOptions } from '../shared/types.js'

import type {
  Gcp,
  Point,
  Ring,
  Rectangle,
  Bbox,
  GeojsonPolygon,
  FetchFn,
  ImageInformations,
  TileZoomLevel
} from '@allmaps/types'
import type {
  Helmert,
  TransformationType,
  TransformOptions,
  DistortionMeasure
} from '@allmaps/transform'

import type Viewport from '../viewport/Viewport.js'
import type FetchableTile from '../tilecache/FetchableTile.js'

// TODO: consider to make the default options more precise
const TRANSFORMER_OPTIONS = {
  maxOffsetRatio: 0.05,
  maxDepth: 2,
  differentHandedness: true
} as Partial<TransformOptions>

const DEFAULT_VISIBLE = true

function createDefaultWarpedMapOptions(): Partial<WarpedMapOptions> {
  return {
    visible: DEFAULT_VISIBLE
  }
}

export function createWarpedMapFactory() {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) => new WarpedMap(mapId, georeferencedMap, options)
}

/**
 * Class for warped maps.
 * This class describes how a georeferenced map is warped using a specific transformation.
 *
 * @export
 * @class WarpedMap
 * @typedef {WarpedMap}
 * @extends {EventTarget}
 * @param {string} mapId - ID of the map
 * @param {GeoreferencedMap} georeferencedMap - Georeferenced map used to construct the WarpedMap
 * @param {Gcp[]} gcps - Ground control points used for warping this map, from resource coordinates to geospatial coordinates
 * @param {Gcp[]} projectedGcps - Projected ground control points, from resource coordinates to projected geospatial coordinates
 * @param {Point[]} projectedGeoControlPoints - The projected geospatial coordinates of the projected ground control points
 * @param {Point[]} projectedGeoPreviousTransformedResourcePoints - The projectedGeoTransformedResourcePoints of the previous transformation type, used during transformation transitions
 * @param {Point[]} projectedGeoTransformedResourcePoints - The resource coordinates of the ground control points, transformed to projected geospatial coordinates using the projected transformer
 * @param {Ring} resourcePreviousLongerMask - Previous resourceLongerMask
 * @param {Ring} resourcePreviousMask - Resource mask of the previous transformation type
 * @param {Ring} resourceLongerMask - Resource mask, possibly longer so it's the same length as the longest of projectedGeoMask and projectedGeoPreviousMask
 * @param {Ring} resourceMask - Resource mask
 * @param {Bbox} resourceMaskBbox - Bbox of the resourceMask
 * @param {Rectangle} resourceMaskRectangle - Rectangle of the resourceMaskBbox
 * @param {Ring} resourceFullMask - Resource full mask (describing the entire extent of the image)
 * @param {Bbox} resourceFullMaskBbox - Bbox of the resource full mask
 * @param {Rectangle} resourceFullMaskRectangle - Rectangle of the resource full mask bbox
 * @param {string} [imageId] - ID of the image
 * @param {IIIFImage} [parsedImage] - ID of the image
 * @param {boolean} visible - Whether the map is visible
 * @param {TransformationType} transformationType - Transformation type used in the transfomer
 * @param {GcpTransformer} transformer - Transformer used for warping this map from resource coordinates to geospatial coordinates
 * @param {GcpTransformer} projectedPreviousTransformer - Previous transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param {GcpTransformer} projectedTransformer - Transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param {GeojsonPolygon} geoMask - resourceMask in geospatial coordinates
 * @param {Bbox} geoMaskBbox - Bbox of the geoMask
 * @param {Rectangle} geoMaskRectangle - resourceMaskRectangle in geospatial coordinates
 * @param {GeojsonPolygon} geoFullMask - resourceFullMask in geospatial coordinates
 * @param {Bbox} geoFullMaskBbox - Bbox of the geoFullMask
 * @param {Rectangle} geoFullMaskRectangle - resourceFullMaskRectangle in geospatial coordinates
 * @param {Ring} projectedGeoPreviousLongerMask - The projectedGeoMask of the previous transformation type, possibly longer so it's the same length as the longest of projectedGeoPreviousMask and projectedGeoMask, used during transformation transitions
 * @param {Ring} projectedGeoPreviousMask - The projectedGeoMask of the previous transformation type, used during transformation transitions
 * @param {Ring} projectedGeoLongerMask - The projectedGeoMask of the previous transformation type, possibly longer so it's the same length as the longest of projectedGeoPreviousMask and projectedGeoMask, used during transformation transitions
 * @param {Ring} projectedGeoMask - resourceMask in projected geospatial coordinates
 * @param {Bbox} projectedGeoMaskBbox - Bbox of the projectedGeoMask
 * @param {Rectangle} projectedGeoMaskRectangle - resourceMaskRectanglee in projected geospatial coordinates
 * @param {Ring} projectedGeoFullMask - resourceFullMask in projected geospatial coordinates
 * @param {Bbox} projectedGeoFullMaskBbox - Bbox of the projectedGeoFullMask
 * @param {Rectangle} projectedGeoFullMaskRectangle - resourceFullMaskRectangle in projected geospatial coordinates
 * @param {number} resourceToProjectedGeoScale - Scale of the warped map, in resource pixels per projected geospatial coordinates
 * @param {DistortionMeasure} [distortionMeasure] - Distortion measure displayed for this map
 * @param {number} currentBestScaleFactor - The best tile scale factor for displaying this map, at the current viewport
 * @param {TileZoomLevel} [currentOverviewTileZoomLevel] - The overview tile zoom level, at the current viewport
 * @param {Ring} currentResourceViewportRing - The viewport transformed back to resource coordinates
 * @param {Bbox} currentResourceViewportRingBbox - Bbox of the resourceViewportRing
 * @param {Tile[]} currentFetchableTiles - The fetchable tiles for displaying this map, at the current viewport
 * @param {Tile[]} currentOverviewFetchableTiles - The overview fetchable tiles, at the current viewport
 */
export default class WarpedMap extends EventTarget {
  mapId: string
  georeferencedMap: GeoreferencedMap

  gcps: Gcp[]
  projectedGcps: Gcp[]
  projectedGeoPoints: Point[]
  projectedGeoPreviousTransformedResourcePoints!: Point[]
  projectedGeoTransformedResourcePoints!: Point[]

  resourcePreviousLongerMask!: Ring
  resourcePreviousMask!: Ring
  resourceLongerMask!: Ring
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
  protected abortController?: AbortController

  visible: boolean

  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedPreviousTransformer!: GcpTransformer
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

  projectedGeoPreviousLongerMask!: Ring
  projectedGeoLongerMask!: Ring
  projectedGeoMask!: Ring
  projectedGeoMaskBbox!: Bbox
  projectedGeoMaskRectangle!: Rectangle
  projectedGeoFullMask!: Ring
  projectedGeoFullMaskBbox!: Bbox
  projectedGeoFullMaskRectangle!: Rectangle

  resourceToProjectedGeoScale!: number

  distortionMeasure?: DistortionMeasure

  // The properties below are for the current viewport

  currentBestScaleFactor!: number
  currentOverviewTileZoomLevel?: TileZoomLevel

  currentResourceViewportRing: Ring = []
  currentResourceViewportRingBbox!: Bbox

  currentFetchableTiles: FetchableTile[] = []
  currentOverviewFetchableTiles: FetchableTile[] = []

  /**
   * Creates an instance of WarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param {WarpedMapOptions} [options] - options
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
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
    this.projectedGeoPoints = this.projectedGcps.map(
      (projectedGcp) => projectedGcp.geo
    )

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
      options.transformation?.type ||
      this.georeferencedMap.transformation?.type ||
      'polynomial'

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
   * Get Bbox of resourceMask in viewport coordinates
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
  getReferenceScale(): number {
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
  setCurrentResourceViewportRing(resourceViewportRing: Ring): void {
    this.currentResourceViewportRing = resourceViewportRing
    this.currentResourceViewportRingBbox = computeBbox(resourceViewportRing)
  }

  /**
   * Set tiles at current viewport
   *
   * @param {FetchableTile[]} fetchableTiles
   */
  setCurrentFetchableTiles(fetchableTiles: FetchableTile[]): void {
    this.currentFetchableTiles = fetchableTiles
  }

  /**
   * Set overview tiles at current viewport
   *
   * @param {FetchableTile[]} overviewFetchableTiles
   */
  setCurrentOverviewFetchableTiles(
    overviewFetchableTiles: FetchableTile[]
  ): void {
    this.currentOverviewFetchableTiles = overviewFetchableTiles
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
    this.updateDistortionProperties()
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
   * Set the bestScaleFactor for the current viewport
   *
   * @param {number} scaleFactor - scale factor
   * @returns {boolean}
   */
  setCurrentBestScaleFactor(scaleFactor: number): boolean {
    const updating = this.currentBestScaleFactor != scaleFactor
    if (updating) {
      this.currentBestScaleFactor = scaleFactor
    }
    return updating
  }

  /**
   * Set the overview tile zoom level for the current viewport
   *
   * @param {TileZoomLevel} tileZoomLevel - tile zoom level
   * @returns {boolean}
   */
  setCurrentOverviewTileZoomLevel(tileZoomLevel?: TileZoomLevel) {
    this.currentOverviewTileZoomLevel = tileZoomLevel
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
   * Reset the previous points and values.
   */
  resetPrevious() {
    this.projectedPreviousTransformer = this.projectedTransformer
    this.projectedGeoPreviousTransformedResourcePoints =
      this.projectedGeoTransformedResourcePoints
    this.resourcePreviousMask = this.resourceMask
    this.resourcePreviousLongerMask = this.resourceLongerMask
    this.projectedGeoPreviousLongerMask = this.projectedGeoLongerMask
  }

  /**
   * Mix the previous and new points and values.
   *
   * @param {number} t
   */
  mixPreviousAndNew(t: number) {
    this.projectedGeoPreviousTransformedResourcePoints =
      this.projectedGeoTransformedResourcePoints.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoPreviousTransformedResourcePoints[index],
          t
        )
      })
    this.projectedGeoPreviousLongerMask = this.projectedGeoLongerMask.map(
      (point, index) => {
        return mixPoints(point, this.projectedGeoPreviousLongerMask[index], t)
      }
    )
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
        this.abortController = new AbortController()
        const signal = this.abortController.signal
        imageInfo = await fetchImageInfo(imageUri, { signal }, this.fetchFn)
        this.abortController = undefined

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

  private updateResourceMaskProperties() {
    this.resourceMaskBbox = computeBbox(this.resourceMask)
    this.resourceMaskRectangle = bboxToRectangle(this.resourceMaskBbox)

    if (!this.resourcePreviousMask) {
      this.resourcePreviousMask = this.resourceMask
    }
  }

  protected updateTransformerProperties(useCache = true): void {
    this.updateTransformer(useCache)
    this.updateProjectedTransformer(useCache)
    this.updateProjectedGeoTransformedResourcePoints()
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
    if (!this.projectedPreviousTransformer) {
      this.projectedPreviousTransformer = this.projectedTransformer
    }
  }

  private updateProjectedGeoTransformedResourcePoints(): void {
    this.projectedGeoTransformedResourcePoints = this.gcps.map((projectedGcp) =>
      this.projectedTransformer.transformForward(projectedGcp.resource)
    )

    if (!this.projectedGeoPreviousTransformedResourcePoints) {
      this.projectedGeoPreviousTransformedResourcePoints =
        this.projectedGeoTransformedResourcePoints
    }
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
      [this.resourceMaskRectangle],
      { maxDepth: 0 }
    )[0] as Rectangle

    // Computing the resourceLongerMask as the longest resource
    // coordinates corresponding to projectedGeoMask and projectedGeoPreviousMask
    // such that projectedGeoPreviousLongerMask and projectedGeoLongerMask
    // can be computed from this equal length starting point to be equally long as well
    this.resourceLongerMask = this.projectedTransformer.transformForward(
      [this.resourceMask],
      { returnDomain: 'inverse' } // refine this lineString but return resource coordinates
    )[0]
    if (!this.resourcePreviousLongerMask) {
      this.resourcePreviousLongerMask = this.resourceLongerMask
    }
    const previousWasLonger =
      this.resourceLongerMask.length < this.resourcePreviousLongerMask.length
    const newIsLonger =
      this.resourceLongerMask.length > this.resourcePreviousLongerMask.length
    if (previousWasLonger) {
      this.resourceLongerMask = this.resourcePreviousLongerMask
    }
    this.projectedGeoLongerMask = this.projectedTransformer.transformForward(
      this.resourceLongerMask,
      { inputIsMultiGeometry: true } // treat the input as an array of points instead of a lineString to refine
    )
    if (!this.projectedGeoPreviousLongerMask || newIsLonger) {
      this.projectedGeoPreviousLongerMask =
        this.projectedPreviousTransformer.transformForward(
          this.resourceLongerMask,
          {
            inputIsMultiGeometry: true
          }
        )
    }
  }

  private updateProjectedFullGeoMask(): void {
    this.projectedGeoFullMask = this.projectedTransformer.transformForward([
      this.resourceFullMask
    ])[0]
    this.projectedGeoFullMaskBbox = computeBbox(this.projectedGeoFullMask)
    this.projectedGeoFullMaskRectangle =
      this.projectedTransformer.transformForward(
        [this.resourceFullMaskRectangle],
        { maxDepth: 0 }
      )[0] as Rectangle
  }

  private updateResourceToProjectedGeoScale(): void {
    this.resourceToProjectedGeoScale = rectanglesToScale(
      this.resourceMaskRectangle,
      this.projectedGeoMaskRectangle
    )
  }

  protected updateDistortionProperties(): void {}

  destroy() {
    if (this.abortController) {
      this.abortController.abort()
    }
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
  declare imageId: string
  declare parsedImage: IIIFImage

  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)
  }
}
