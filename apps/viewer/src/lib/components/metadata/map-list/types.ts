import type { GeoreferencedMap } from '@allmaps/annotation'
import type { MapRenderError } from '$lib/state/maps.svelte.js'

export type MapListRow = {
  map: GeoreferencedMap
  mapId?: string
  resource: GeoreferencedMap['resource']
  mapNumber: number
  title: string
  modifiedLabel?: string
  gcpCountLabel: string
  transformationLabel: string
  resourceCrsLabel: string
  mapUrl: string
  thumbnailAlt: string
  renderError?: MapRenderError
  isEmbedded: boolean
}

export type ThumbnailErrorMessage = {
  title: string
  message?: string
}
