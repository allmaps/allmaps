import type { Polygon } from 'geojson'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { LanguageString } from '@allmaps/iiif-parser'

import type { DbMap } from '@allmaps/db'

export type IntersectsWith = [number, number] | [number, number, number, number]
export type ContainedBy = [number, number, number, number]

export type MapsQueryParams = {
  mapId: string
  imageId: string
  manifestId: string
  canvasId: string
  version: string
  imageServiceDomain: string
  manifestDomain: string
  imageChecksum: string
  checksum: string
  intersectsWith: IntersectsWith
  containedBy: ContainedBy
  limit: number
  randomMapId: string
  randomMapIdOp: 'gt' | 'lte'
  minScale: number
  maxScale: number
  minArea: number
  maxArea: number
}

export type MapsQueryUrlParams = {
  key?: string
  limit: string
  imageservicedomain: string
  manifestdomain: string
  intersects: string
  containedby: string
  minscale: string
  maxscale: string
  minarea: string
  maxarea: string
}

export type ExtParams = {
  ext?: string
}

export type ResponseFormat = 'map' | 'annotation' | 'geojson'

export type ResponseOptions = {
  format: ResponseFormat
  expectRows: boolean
  singular: boolean
  id?: string
}

export type Callback<T> = (err?: Error | null, result?: T) => void

// Row type returned by Drizzle queries

export type DbRow = {
  map: DbMap
  geoMask: Polygon
  image: {
    id: string
    uri: string
    data?: unknown
    embedded: boolean
    organizationUrl: {
      url: string
      organization: {
        id: string
        name: string
        homepage: string | null
        slug: string
        plan: string | null
      } | null
    } | null
    canvases: {
      id: string
      uri: string
      label: LanguageString | null
      manifests: {
        id: string
        uri: string
        label: LanguageString | null
      }[]
    }[]
  } | null
  checksum: string
  imageChecksum: string
  createdAt: Date
  updatedAt: Date
  scale: number | null
  area: number | null
}

// Output types

export type ApiMap = GeoreferencedMap & {
  geoMask?: Polygon
  _allmaps?: {
    id: string
    version: string
    image:
      | {
          id: string
          version: string
          canvases: {
            id: string
            manifests: {
              id: string
            }[]
          }[]
        }
      | undefined
    scale?: number
    area?: number
  }
}
