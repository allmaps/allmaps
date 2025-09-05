import type {
  Image as IIIFImage,
  Manifest as IIIFManifest,
  Collection as IIIFCollection
} from '@allmaps/iiif-parser'

import type { GeoreferencedMap } from '@allmaps/annotation'

export type ParamKey =
  | 'url'
  | 'manifest'
  | 'image'
  | 'map'
  | 'callback'
  | 'bbox'
  | 'basemap-url'
  | 'basemap-preset'
  | 'background-georeference-annotation-url'

export type Params = { [key in ParamKey]?: string | null }

export type Organization = {
  id: string
  title: string
  subtitle?: string
}

export type GCP = {
  resource: Point
  geo: Point
}

export type Point = [number, number]

export type View = 'images' | 'mask' | 'georeference' | 'results'
export type RouteID = View | ''

export type Scope = 'images' | 'image' | 'map'

export type SourceType = 'image' | 'manifest' | 'collection'

type BaseSource = {
  url: string
  allmapsId: string
  sourceIiif: unknown
  type: SourceType
  parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
}

type ImageSource = {
  type: 'image'
  parsedIiif: IIIFImage
}

type ManifestSource = {
  type: 'manifest'
  parsedIiif: IIIFManifest
}

type CollectionSource = {
  type: 'collection'
  parsedIiif: IIIFCollection
}

export type Source = BaseSource &
  (ImageSource | ManifestSource | CollectionSource)

export type DbImageService = 'ImageService1' | 'ImageService2' | 'ImageService3'

export type GeoreferencedMapsByImageId = Record<string, GeoreferencedMap[]>

export type LabelIndexFromGcpIdFn = (gcpId: string) => number

export type GcpCoordinates = {
  resource?: Point
  geo?: Point
}

export type Example = {
  organizationId: string
  title: string
  manifestId?: string
  imageId: string
}

export type Viewport = {
  zoom: number
  center: [number, number]
  bearing: number
}

export type PresetBaseMapID = 'esri-world-topo' | 'esri-world-imagery' | 'osm'

export type ClickedItem =
  | { type: 'map'; mapId: string }
  | { type: 'gcp'; mapId: string; gcpId: string }
