import { setContext, getContext } from 'svelte'

import { toGeoreferencedMap } from '$lib/shared/maps.js'
import { isComplete } from '$lib/shared/analyze.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { ProjectionsState } from '@allmaps/components/state'

import type { GeoreferencedMapsByImageId } from '$lib/types/shared.js'
import type { DbMap3 } from '$lib/types/maps.js'

import type { MapsState } from '$lib/state/maps.svelte.js'
import type { ApiState } from '$lib/state/api.svelte.js'
import type { MapsHistoryState } from '$lib/state/maps-history.svelte.js'

const MAPS_MERGED_KEY = Symbol('maps-merged')

export class MapsMergedState {
  #apiState: ApiState
  #mapsHistoryState: MapsHistoryState
  #mapsState: MapsState
  #projectionsState: ProjectionsState

  #mapsByImageId = $derived.by<GeoreferencedMapsByImageId>(() => {
    const mapsHistoryMapsByImageId: GeoreferencedMapsByImageId =
      this.#toGeoreferencedMapsByImageId(
        Object.fromEntries(this.#mapsHistoryState.mapsByImageId.entries())
      )

    let activeImageMapsByImageId: GeoreferencedMapsByImageId = {}
    if (this.#mapsState.connectedImageId && this.#mapsState.maps) {
      activeImageMapsByImageId = this.#toGeoreferencedMapsByImageId({
        [this.#mapsState.connectedImageId]: this.#mapsState.maps
      })
    }

    return this.#mergeMapsByImageId(
      activeImageMapsByImageId,
      mapsHistoryMapsByImageId,
      this.#apiState.mapsByImageId
    )
  })

  #mapsById = $derived.by(() =>
    Object.fromEntries(this.maps.map((map) => [map.id, map]))
  )

  constructor(
    mapsState: MapsState,
    mapsHistoryState: MapsHistoryState,
    apiState: ApiState,
    projectionsState: ProjectionsState
  ) {
    this.#apiState = apiState
    this.#mapsHistoryState = mapsHistoryState
    this.#mapsState = mapsState
    this.#projectionsState = projectionsState
  }

  #mergeMapsByImageId(
    ...georeferencedMapsByImageIdList: GeoreferencedMapsByImageId[]
  ): GeoreferencedMapsByImageId {
    return Object.fromEntries(
      Object.entries(
        georeferencedMapsByImageIdList.reduce((acc, mapsByImageId) => {
          Object.entries(mapsByImageId).forEach(([imageId, maps]) => {
            if (!acc[imageId]) {
              acc[imageId] = []
            }

            // Add only maps that are not already in the list (by mapId)
            maps.forEach((map) => {
              if (!acc[imageId].some((m) => m.id === map.id)) {
                acc[imageId].push(map)
              }
            })
          })

          return acc
        }, {} as GeoreferencedMapsByImageId)
      )
    )
  }

  #toGeoreferencedMapsByImageId(
    mapsByImageId: Record<string, DbMap3[]>
  ): Record<string, GeoreferencedMap[]> {
    return Object.fromEntries(
      Object.entries(mapsByImageId).map(([imageId, maps]) => [
        imageId,
        maps.map((map) =>
          toGeoreferencedMap(map, this.#projectionsState.projectionsById)
        )
      ])
    )
  }

  get mapsByImageId() {
    return this.#mapsByImageId
  }

  get maps() {
    return Object.values(this.#mapsByImageId).flat()
  }

  getMapsById(mapIds: Iterable<string>) {
    return Array.from(mapIds).flatMap((mapId) => this.#mapsById[mapId] || [])
  }

  get completeMaps() {
    return Object.values(this.#mapsByImageId).flat().filter(isComplete)
  }

  get fetched() {
    return this.#apiState.fetched
  }
}

export function setMapsMergedState(
  mapsState: MapsState,
  mapsHistoryState: MapsHistoryState,
  apiState: ApiState,
  projectionsState: ProjectionsState
) {
  return setContext(
    MAPS_MERGED_KEY,
    new MapsMergedState(mapsState, mapsHistoryState, apiState, projectionsState)
  )
}

export function getMapsMergedState() {
  const mapsMergedState =
    getContext<ReturnType<typeof setMapsMergedState>>(MAPS_MERGED_KEY)

  if (!mapsMergedState) {
    throw new Error('MapsMergedState is not set')
  }

  return mapsMergedState
}
