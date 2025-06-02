import type { Polygon as GeojsonPolygon } from 'geojson'

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
  polygon: GeojsonPolygon
  hostname: string
  timeAgo?: string
  properties: Properties
}
