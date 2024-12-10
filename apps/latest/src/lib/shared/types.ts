import type { Polygon } from 'geojson'

export type Urls = {
  annotation?: string
  viewer?: string
  editor?: string
}

export type Properties = {
  areaStr?: string
  gcpCount: number
  resourceMaskPointCount: number
}

export type DisplayMap = {
  polygon: Polygon
  hostname: string
  timeAgo?: string
  properties: Properties
}
