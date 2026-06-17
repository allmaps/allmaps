import { setContext, getContext } from 'svelte'
import { SvelteSet } from 'svelte/reactivity'

import { generateChecksum } from '@allmaps/id/sync'

import { searchParams } from '$lib/shared/params.js'

import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'

import type { MapsHierarchy, Source } from '$lib/types/shared.js'

import type { SourceState } from '$lib/state/source.svelte.js'
import type { UrlState } from '$lib/state/url.svelte.js'
import type { UiState } from '$lib/state/ui.svelte.js'

const MAPS_KEY = Symbol('maps')

export type ThumbnailRegion = {
  x: number
  y: number
  width: number
  height: number
}

export class MapsState {
  #sourceState: SourceState
  #urlState: UrlState<typeof searchParams>
  #uiState: UiState

  #maps = $derived.by(() => this.#getMapsFromSource(this.#sourceState.source))

  #embeddedMapIds = $derived.by(() => {
    const embeddedMapIds = new SvelteSet<string>()
    const source = this.#sourceState.source

    if (source?.parsed.type === 'iiif') {
      for (const map of source.parsed.embeddedMaps ?? []) {
        const mapId = this.#ensureMapId(map).id

        if (mapId) {
          embeddedMapIds.add(mapId)
        }
      }
    }

    return embeddedMapIds
  })

  #visibleMaps = $derived.by(() => {
    const hiddenMapIds = this.#uiState.hiddenMapIds

    return this.#maps.filter((map) => map.id && !hiddenMapIds.includes(map.id))
  })

  #mapsHierarchy = $derived(this.#getMapsHierarchy(this.#maps))

  #thumbnailRegions = $derived.by(() => {
    const thumbnailRegions = new Map<string, ThumbnailRegion | undefined>()

    for (const map of this.#maps) {
      if (map.id) {
        thumbnailRegions.set(map.id, this.#computeThumbnailRegion(map))
      }
    }

    return thumbnailRegions
  })

  #previousMapId = $derived.by(() => {
    return this.#getSiblingVisibleMapId(-1)
  })

  #nextMapId = $derived.by(() => {
    return this.#getSiblingVisibleMapId(1)
  })

  constructor(
    sourceState: SourceState,
    urlState: UrlState<typeof searchParams>,
    uiState: UiState
  ) {
    this.#sourceState = sourceState
    this.#urlState = urlState
    this.#uiState = uiState
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
      return source.parsed.maps.map((map) => this.#ensureMapId(map))
    } else if (source?.parsed.type === 'iiif') {
      return [
        ...(source.parsed.embeddedMaps || []),
        ...(source.parsed.apiMaps || [])
      ].map((map) => this.#ensureMapId(map))
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

  #getSiblingVisibleMapId(direction: -1 | 1) {
    const currentMapId = this.#urlState.params.mapId

    if (this.#visibleMaps.length === 0) {
      return undefined
    }

    if (!currentMapId) {
      return this.#visibleMaps[0].id
    }

    const currentVisibleIndex = this.#visibleMaps.findIndex(
      (map) => map.id === currentMapId
    )

    if (currentVisibleIndex !== -1) {
      return this.#visibleMaps[
        (currentVisibleIndex + direction + this.#visibleMaps.length) %
          this.#visibleMaps.length
      ].id
    }

    const currentSourceIndex = this.#maps.findIndex(
      (map) => map.id === currentMapId
    )

    if (currentSourceIndex === -1) {
      return this.#visibleMaps[0].id
    }

    for (let offset = 1; offset <= this.#maps.length; offset++) {
      const map =
        this.#maps[
          (currentSourceIndex + direction * offset + this.#maps.length) %
            this.#maps.length
        ]

      if (map.id && !this.#uiState.isMapHidden(map.id)) {
        return map.id
      }
    }
  }

  #getResourceMaskBbox(resourceMask: GeoreferencedMap['resourceMask']) {
    if (!resourceMask.length) {
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const [x, y] of resourceMask) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return
    }

    return [minX, minY, maxX, maxY] as const
  }

  #computeThumbnailRegion(map: GeoreferencedMap): ThumbnailRegion | undefined {
    const resource = map.resource

    if (!resource.width || !resource.height) {
      return
    }

    const bbox = this.#getResourceMaskBbox(map.resourceMask)

    if (!bbox) {
      return
    }

    const [minX, minY, maxX, maxY] = bbox
    const width = maxX - minX
    const height = maxY - minY
    const padding = Math.max(width, height) * 0.1

    const x = Math.max(0, minX - padding)
    const y = Math.max(0, minY - padding)
    const right = Math.min(resource.width, maxX + padding)
    const bottom = Math.min(resource.height, maxY + padding)

    if (right <= x || bottom <= y) {
      return
    }

    return {
      x,
      y,
      width: right - x,
      height: bottom - y
    }
  }

  get maps() {
    return this.#maps
  }

  get visibleMaps() {
    return this.#visibleMaps
  }

  get mapCount() {
    return this.#maps.length
  }

  get visibleMapCount() {
    return this.#visibleMaps.length
  }

  canHideMap(mapId?: string) {
    return (
      !!mapId &&
      (this.#uiState.isMapHidden(mapId) || this.#visibleMaps.length > 1)
    )
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

  getThumbnailRegion(map: GeoreferencedMap) {
    return map.id ? this.#thumbnailRegions.get(map.id) : undefined
  }

  isEmbeddedMap(mapId?: string) {
    return !!mapId && this.#embeddedMapIds.has(mapId)
  }
}

export function setMapsState(
  sourceState: SourceState,
  urlState: UrlState<typeof searchParams>,
  uiState: UiState
) {
  return setContext(MAPS_KEY, new MapsState(sourceState, urlState, uiState))
}

export function getMapsState() {
  const mapsState = getContext<MapsState>(MAPS_KEY)
  if (!mapsState) {
    throw new Error('MapsState is not set')
  }

  return mapsState
}
