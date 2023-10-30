import { generateId } from '@allmaps/id'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import {
  computeBbox,
  fetchImageInfo,
  lonLatToWebMecator
} from '@allmaps/stdlib'

import type { Gcp, Ring, Bbox, GeojsonPolygon } from '@allmaps/types'
import type {
  TransformationType,
  PartialTransformOptions
} from '@allmaps/transform'

export default class WarpedMap {
  mapId: string
  georeferencedMap: GeoreferencedMap
  gcps: Gcp[]
  projectedGcps: Gcp[]
  resourceMask: Ring
  fullResourceMask: Ring
  imageInfoCache?: Cache
  imageId?: string
  parsedImage?: IIIFImage
  visible: boolean
  transformationType: TransformationType
  transformer!: GcpTransformer
  transformOptions: PartialTransformOptions
  geoMask!: GeojsonPolygon
  fullGeoMask!: GeojsonPolygon
  geoMaskBbox!: Bbox
  fullGeoMaskBbox!: Bbox

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
    this.fullResourceMask = [
      [0, 0],
      [this.georeferencedMap.resource.width, 0],
      [
        this.georeferencedMap.resource.width,
        this.georeferencedMap.resource.height
      ],
      [0, this.georeferencedMap.resource.height]
    ]
    this.imageInfoCache = imageInfoCache
    this.visible = visible
    this.transformationType =
      this.georeferencedMap.transformation?.type || 'polynomial'
    this.transformOptions = {
      maxOffsetRatio: 0.01,
      maxDepth: 6
    }
    this.makeTransformer()
    this.updateGeoMask()
    this.updateFullGeoMask()
  }

  private makeTransformer(transformationType?: TransformationType): void {
    if (!transformationType) {
      transformationType = this.transformationType
    }
    this.transformer = new GcpTransformer(
      this.projectedGcps,
      transformationType
    )
  }

  setTransformationType(transformationType: TransformationType): void {
    this.makeTransformer(transformationType)
    this.updateGeoMask()
    this.updateFullGeoMask()
  }

  setResourceMask(resourceMask: Ring): void {
    this.resourceMask = resourceMask
    this.updateGeoMask()
  }

  private updateGeoMask(): void {
    this.geoMask = this.transformer.transformForwardAsGeojson(
      [this.resourceMask],
      this.transformOptions
    )
    this.geoMaskBbox = computeBbox(this.geoMask)
  }

  private updateFullGeoMask(): void {
    this.fullGeoMask = this.transformer.transformForwardAsGeojson(
      [this.fullResourceMask],
      this.transformOptions
    )
    this.fullGeoMaskBbox = computeBbox(this.fullGeoMask)
  }

  async completeImageInfo(): Promise<void> {
    const imageUri = this.georeferencedMap.resource.id
    const imageInfoJson = await fetchImageInfo(imageUri, {
      cache: this.imageInfoCache
    })
    this.parsedImage = IIIFImage.parse(imageInfoJson)
    this.imageId = await generateId(imageUri)
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
