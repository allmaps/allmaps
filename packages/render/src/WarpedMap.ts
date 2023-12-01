import { applyTransform } from './shared/matrix.js'

import { generateId } from '@allmaps/id'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import { triangulate } from '@allmaps/triangulate'
import {
  computeBbox,
  bboxToRectangle,
  bboxesToScale,
  geometryToDiameter,
  convertGeojsonPolygonToRing,
  fetchImageInfo,
  lonLatToWebMecator,
  mixPoints
} from '@allmaps/stdlib'

import type Viewport from './Viewport.js'

import type { Point, Gcp, Ring, Bbox, GeojsonPolygon } from '@allmaps/types'
import type {
  TransformationType,
  PartialTransformOptions
} from '@allmaps/transform'

// TODO: Consider making this tunable by the user.
const DIAMETER_FRACTION = 80

export default class WarpedMap {
  mapId: string
  georeferencedMap: GeoreferencedMap

  gcps: Gcp[]
  projectedGcps: Gcp[]

  resourceMask: Ring
  resourceMaskBbox: Bbox
  resourceFullMask: Ring
  resourceFullMaskBbox: Bbox

  imageInfoCache?: Cache
  imageId?: string
  parsedImage?: IIIFImage

  visible: boolean

  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedTransformer!: GcpTransformer
  transformOptions: PartialTransformOptions

  geoMask!: GeojsonPolygon
  geoMaskBbox!: Bbox
  geoFullMask!: GeojsonPolygon
  geoFullMaskBbox!: Bbox

  projectedGeoMask!: GeojsonPolygon
  projectedGeoMaskBbox!: Bbox
  projectedGeoFullMask!: GeojsonPolygon
  projectedGeoFullMaskBbox!: Bbox

  resourceToProjectedGeoScale!: number

  bestScaleFactor!: number // At current viewport
  resourceTrianglePointsByBestScaleFactor: Map<number, Point[]> = new Map()

  resourceViewportRing: Ring = [] // At current viewport
  resourceViewportRingBbox?: Bbox

  resourceTrianglePoints: Point[] = []
  projectedGeoCurrentTrianglePoints: Point[] = []
  projectedGeoNewTrianglePoints: Point[] = []

  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    imageInfoCache?: Cache,
    visible = true
  ) {
    this.mapId = mapId
    this.georeferencedMap = georeferencedMap

    this.gcps = this.georeferencedMap.gcps
    this.projectedGcps = this.gcps.map(({ geo, resource }) => ({
      geo: lonLatToWebMecator(geo),
      resource
    }))

    this.resourceMask = this.georeferencedMap.resourceMask
    this.resourceMaskBbox = computeBbox(this.resourceMask)
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

    this.imageInfoCache = imageInfoCache

    this.visible = visible

    this.transformationType =
      this.georeferencedMap.transformation?.type || 'polynomial'
    this.transformOptions = {
      maxOffsetRatio: 0.01,
      maxDepth: 6
    }

    this.updateTransformerProperties()

    // Triangulating before rendering is not strictly necessary
    // But creating the triangulation on the highest zoom level once assures the vertex buffers are long enough
    // TODO: Could this be simplified?
    this.setBestScaleFactor(1)
  }

  getViewportMask(viewport: Viewport): Ring {
    return convertGeojsonPolygonToRing(this.projectedGeoMask).map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  getViewportMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportMask(viewport))
  }

  getApproxViewportMaskBbox(viewport: Viewport): Bbox {
    // Approx since transform of bbox is not as precise as bbox of transform
    // (which is more expensive to compute)
    return computeBbox(
      bboxToRectangle(this.projectedGeoMaskBbox).map((point) => {
        return applyTransform(viewport.projectedGeoToViewportTransform, point)
      })
    )
  }

  getViewportFullMask(viewport: Viewport): Ring {
    return convertGeojsonPolygonToRing(this.projectedGeoFullMask).map(
      (point) => {
        return applyTransform(viewport.projectedGeoToViewportTransform, point)
      }
    )
  }

  getViewportFullMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportFullMask(viewport))
  }

  getApproxViewportFullMaskBbox(viewport: Viewport): Bbox {
    // Approx since transform of bbox is not as precise as bbox of transform
    // (which is more expensive to compute)
    return computeBbox(
      bboxToRectangle(this.projectedGeoFullMaskBbox).map((point) => {
        return applyTransform(viewport.projectedGeoToViewportTransform, point)
      })
    )
  }

  getResourceToViewportScale(viewport: Viewport): number {
    return bboxesToScale(
      this.resourceMaskBbox,
      this.getViewportMaskBbox(viewport)
    )
  }

  getResourceToCanvasScale(viewport: Viewport): number {
    return this.getResourceToViewportScale(viewport) / viewport.devicePixelRatio
  }

  getApproxResourceToViewportScale(viewport: Viewport): number {
    return bboxesToScale(
      this.resourceMaskBbox,
      this.getApproxViewportMaskBbox(viewport)
    )
  }

  getApproxResourceToCanvasScale(viewport: Viewport): number {
    return (
      this.getApproxResourceToViewportScale(viewport) /
      viewport.devicePixelRatio
    )
  }

  setBestScaleFactor(scaleFactor: number) {
    if (this.bestScaleFactor != scaleFactor) {
      this.bestScaleFactor = scaleFactor
      this.updateTriangulation(true)
    }
  }

  setResourceViewportRing(resourceViewportRing: Ring) {
    this.resourceViewportRing = resourceViewportRing
    this.resourceViewportRingBbox = computeBbox(resourceViewportRing)
  }

  updateTriangulation(currentIsNew = false) {
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

      this.resourceTrianglePoints = triangulate(
        this.resourceMask,
        diameter
      ).flat()

      this.resourceTrianglePointsByBestScaleFactor.set(
        this.bestScaleFactor,
        this.resourceTrianglePoints
      )
    }

    this.updateProjectedGeo(currentIsNew)
  }

  updateProjectedGeo(currentIsNew = false) {
    this.projectedGeoNewTrianglePoints = this.resourceTrianglePoints.map(
      (point) => this.projectedTransformer.transformToGeo(point as Point)
    )

    if (currentIsNew || !this.projectedGeoCurrentTrianglePoints.length) {
      this.projectedGeoCurrentTrianglePoints =
        this.projectedGeoNewTrianglePoints
    }
  }

  mixCurrentTrianglePoints(t: number) {
    this.projectedGeoCurrentTrianglePoints =
      this.projectedGeoNewTrianglePoints.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoCurrentTrianglePoints[index],
          t
        )
      })
  }

  resetCurrentTrianglePoints() {
    this.projectedGeoCurrentTrianglePoints = this.projectedGeoNewTrianglePoints
  }

  setResourceMask(resourceMask: Ring): void {
    this.resourceMask = resourceMask
    this.updateGeoMask()
    this.updateProjectedGeoMask()
  }

  setTransformationType(transformationType: TransformationType): void {
    this.transformationType = transformationType
    this.updateTransformerProperties()
  }

  setGcps(gcps: Gcp[]): void {
    this.gcps = gcps
    this.updateTransformerProperties()
  }

  clearResourceTrianglePointsByBestScaleFactor() {
    this.resourceTrianglePointsByBestScaleFactor = new Map()
  }

  async completeImageInfo(): Promise<void> {
    const imageUri = this.georeferencedMap.resource.id
    const imageInfoJson = await fetchImageInfo(imageUri, {
      cache: this.imageInfoCache
    })
    this.parsedImage = IIIFImage.parse(imageInfoJson)
    this.imageId = await generateId(imageUri)
  }

  dispose() {
    this.resourceTrianglePoints = []
    this.projectedGeoCurrentTrianglePoints = []
    this.projectedGeoNewTrianglePoints = []
  }

  private updateTransformerProperties(): void {
    this.updateTransformer()
    this.updateProjectedTransformer()
    this.updateGeoMask()
    this.updateFullGeoMask()
    this.updateProjectedGeoMask()
    this.updateProjectedFullGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  private updateTransformer(): void {
    this.transformer = new GcpTransformer(this.gcps, this.transformationType)
  }

  private updateProjectedTransformer(): void {
    this.projectedTransformer = new GcpTransformer(
      this.projectedGcps,
      this.transformationType
    )
  }

  private updateGeoMask(): void {
    this.geoMask = this.transformer.transformForwardAsGeojson(
      [this.resourceMask],
      this.transformOptions
    )
    this.geoMaskBbox = computeBbox(this.geoMask)
  }

  private updateFullGeoMask(): void {
    this.geoFullMask = this.transformer.transformForwardAsGeojson(
      [this.resourceFullMask],
      this.transformOptions
    )
    this.geoFullMaskBbox = computeBbox(this.geoFullMask)
  }

  private updateProjectedGeoMask(): void {
    this.projectedGeoMask = this.projectedTransformer.transformForwardAsGeojson(
      [this.resourceMask],
      this.transformOptions
    )
    this.projectedGeoMaskBbox = computeBbox(this.projectedGeoMask)
  }

  private updateProjectedFullGeoMask(): void {
    this.projectedGeoFullMask =
      this.projectedTransformer.transformForwardAsGeojson(
        [this.resourceFullMask],
        this.transformOptions
      )
    this.projectedGeoFullMaskBbox = computeBbox(this.projectedGeoFullMask)
  }

  private updateResourceToProjectedGeoScale(): void {
    this.resourceToProjectedGeoScale = bboxesToScale(
      this.resourceMaskBbox,
      this.projectedGeoMaskBbox
    )
  }
}

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

export function hasImageInfo(
  warpedMap: WarpedMap
): warpedMap is WarpedMapWithImageInfo {
  return warpedMap.imageId !== undefined && warpedMap.parsedImage !== undefined
}
