import type {
  Image,
  Manifest,
  Collection,
  LanguageString
} from '@allmaps/iiif-parser'
import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'

type AllmapsSourceType = 'manifests' | 'images' | 'maps'

export type AllmapsId = `${AllmapsSourceType}/${string}`

export type SourceLabels = {
  manifest?: LanguageString
  canvas?: LanguageString
}

export type Organization = {
  label: LanguageString
  url?: string
}

type BaseSource = {
  hash: string
  data: unknown
  parsed: ParsedSource
  allmapsId?: AllmapsId
}

export type ParsedSource =
  | {
      type: 'annotation'
      maps: GeoreferencedMap[]
    }
  | {
      type: 'iiif'
      iiif: Image | Manifest | Collection
      embeddedMaps?: GeoreferencedMap[]
      apiMaps?: GeoreferencedMap[]
    }

export type UrlSource = BaseSource & {
  sourceType: 'url'
  url: string
}

export type StringSource = BaseSource & {
  sourceType: 'string'
}

export type Source = UrlSource | StringSource

export type MapsByManifest = {
  manifest: PartOfItem
  mapsByCanvas: MapsByCanvas[]
}

export type MapsByCanvas = {
  canvas: PartOfItem
  mapsByImage: MapsByImage[]
}

export type MapsByImage = {
  resource: GeoreferencedMap['resource']
  maps: GeoreferencedMap[]
}

// export type MapsHierarchy = (MapsByManifest | MapsByCanvas | MapsByImage)[]

export type MapsHierarchy = {
  mapsByManifest?: MapsByManifest[]
  mapsByCanvas?: MapsByCanvas[]
  mapsByImage?: MapsByImage[]
}
