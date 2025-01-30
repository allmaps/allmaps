import type {
  Image as IIIFImage,
  Manifest as IIIFManifest,
  Collection as IIIFCollection
} from '@allmaps/iiif-parser'

import type { GeoreferencedMap } from '@allmaps/annotation'

export type Params = {
  url: string | null
  image: string | null
  map: string | null
  userBaseMapUrl: string | null
  callback: string | null
  bbox: string | null
}

export type Organization = {
  id: string
  title: string
  subtitle: string
}

export type GCP = {
  resource: Point
  geo: Point
}

export type Point = [number, number]

export type RouteID = 'images' | 'mask' | 'georeference' | 'results' | ''

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
  manifestId: string
  imageId: string
}
