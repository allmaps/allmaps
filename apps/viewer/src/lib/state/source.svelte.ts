import { setContext, getContext } from 'svelte'

import { generateChecksum } from '@allmaps/id/sync'

import { searchParams } from '$lib/shared/params.js'

import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'

import type { MapsHierarchy, Source } from '$lib/types/shared.js'

import type { UrlState } from '$lib/state/url.svelte.js'
import type { UiState } from '$lib/state/ui.svelte.js'

const SOURCE_KEY = Symbol('source')

export class SourceState {
  #urlState: UrlState<typeof searchParams>
  #uiState: UiState

  #source = $state<Source | undefined>()

  #maps = $derived(this.#getMapsFromSource(this.#source))

  #mapsHierarchy = $derived(this.#getMapsHierarchy(this.#maps))

  #previousMapId = $derived.by(() => {
    const currentMapId = this.#urlState.params.mapId

    if (this.#maps.length === 0) {
      return undefined
    }

    if (!currentMapId) {
      return this.#maps[0].id
    }

    const currentIndex = this.#maps.findIndex((map) => map.id === currentMapId)

    return this.#maps[
      (currentIndex - 1 + this.#maps.length) % this.#maps.length
    ].id
  })

  #nextMapId = $derived.by(() => {
    const currentMapId = this.#urlState.params.mapId

    if (this.#maps.length === 0) {
      return undefined
    }

    if (!currentMapId) {
      return this.#maps[0].id
    }

    const currentIndex = this.#maps.findIndex((map) => map.id === currentMapId)

    return this.#maps[(currentIndex + 1) % this.#maps.length].id
  })

  constructor(
    urlState: UrlState<typeof searchParams>,
    uiState: UiState,
    initialSource?: Source
  ) {
    this.#urlState = urlState
    this.#uiState = uiState

    this.source = initialSource
  }

  #ensureMapId(map: GeoreferencedMap): GeoreferencedMap {
    if (!map.id) {
      const checksum = generateChecksum(map)
      return {
        ...map,
        id: checksum
      }
    }
    return map
  }

  #getMapsFromSource(source?: Source) {
    if (source?.parsed.type === 'annotation') {
      return source.parsed.maps.map(this.#ensureMapId)
    } else if (source?.parsed.type === 'iiif') {
      return [
        ...(source.parsed.embeddedMaps || []),
        ...(source.parsed.apiMaps || [])
      ].map(this.#ensureMapId)
    }

    return []
  }

  #getMapsHierarchy(maps: GeoreferencedMap[]): MapsHierarchy {
    type ByResource = Map<
      string,
      { resource: GeoreferencedMap['resource']; maps: GeoreferencedMap[] }
    >
    type ByCanvas = Map<string, { canvas: PartOfItem; byResource: ByResource }>

    const byManifest = new Map<
      string,
      { manifest: PartOfItem; byCanvas: ByCanvas }
    >()
    const byCanvasOnly = new Map<
      string,
      { canvas: PartOfItem; byResource: ByResource }
    >()
    const byResourceOnly: ByResource = new Map()

    const addToResource = (byResource: ByResource, map: GeoreferencedMap) => {
      const id = map.resource.id
      if (!byResource.has(id)) {
        byResource.set(id, { resource: map.resource, maps: [] })
      }
      byResource.get(id)!.maps.push(map)
    }

    for (const map of maps) {
      const canvasItems = (map.resource.partOf ?? []).filter(
        (item) => item.type === 'Canvas'
      )

      if (canvasItems.length === 0) {
        addToResource(byResourceOnly, map)
      } else {
        for (const canvas of canvasItems) {
          const manifestItems = (canvas.partOf ?? []).filter(
            (item) => item.type === 'Manifest'
          )

          if (manifestItems.length === 0) {
            if (!byCanvasOnly.has(canvas.id)) {
              byCanvasOnly.set(canvas.id, { canvas, byResource: new Map() })
            }
            addToResource(byCanvasOnly.get(canvas.id)!.byResource, map)
          } else {
            for (const manifest of manifestItems) {
              if (!byManifest.has(manifest.id)) {
                byManifest.set(manifest.id, { manifest, byCanvas: new Map() })
              }
              const manifestEntry = byManifest.get(manifest.id)!

              if (!manifestEntry.byCanvas.has(canvas.id)) {
                manifestEntry.byCanvas.set(canvas.id, {
                  canvas,
                  byResource: new Map()
                })
              }
              addToResource(
                manifestEntry.byCanvas.get(canvas.id)!.byResource,
                map
              )
            }
          }
        }
      }
    }

    const result: MapsHierarchy = {}

    if (byManifest.size > 0) {
      result.mapsByManifest = [...byManifest.values()].map(
        ({ manifest, byCanvas }) => ({
          manifest,
          mapsByCanvas: [...byCanvas.values()].map(
            ({ canvas, byResource }) => ({
              canvas,
              mapsByImage: [...byResource.values()]
            })
          )
        })
      )
    }

    if (byCanvasOnly.size > 0) {
      result.mapsByCanvas = [...byCanvasOnly.values()].map(
        ({ canvas, byResource }) => ({
          canvas,
          mapsByImage: [...byResource.values()]
        })
      )
    }

    if (byResourceOnly.size > 0) {
      result.mapsByImage = [...byResourceOnly.values()]
    }

    return result
  }

  set source(source: Source | undefined) {
    this.#uiState.reset()
    // this.#urlState.params.mapId = undefined
    this.#source = source
  }

  get source(): Source | undefined {
    return this.#source
  }

  get maps() {
    return this.#maps
  }

  get mapCount() {
    return this.#maps.length
  }

  get previousMapId() {
    return this.#previousMapId
  }

  get nextMapId() {
    return this.#nextMapId
  }

  get mapsHierarchy() {
    return this.#mapsHierarchy
  }
}

export function setSourceState(
  urlState: UrlState<typeof searchParams>,
  uiState: UiState,
  initialSource?: Source
) {
  return setContext(
    SOURCE_KEY,
    new SourceState(urlState, uiState, initialSource)
  )
}

export function getSourceState() {
  const sourceState = getContext<SourceState>(SOURCE_KEY)
  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
