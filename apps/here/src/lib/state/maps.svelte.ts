import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchJson } from '@allmaps/stdlib'
import { parseAnnotation } from '@allmaps/annotation'

import { env } from '$env/dynamic/public'

import { computePositionDistance } from '$lib/shared/position.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { SensorsState } from '$lib/state/sensors.svelte.js'
import type { ImageInfoState } from '$lib/state/image-info.svelte.js'
import type { ErrorState } from '$lib/state/error.svelte.js'
import type { UiState } from '$lib/state/ui.svelte.js'

import type { MapWithImageInfo } from '$lib/shared/types.ts'

const THRESHOLD_TIMESTAMP = 5000 // 5 seconds in milliseconds
const THRESHOLD_DISTANCE = 10 // 10 meters

const MAX_AREA = 500_000_000_000

const NEARBY_MAPS_COUNT = 40

const MAPS_KEY = Symbol('maps')

export class MapsState {
  #sensorsState: SensorsState
  #imageInfoState: ImageInfoState
  #uiState: UiState

  #fetchCount = $state(0)
  #loading = $state(false)

  #lastPosition = $state<GeolocationPosition>()

  #mapsFromCoordinates = $state<SvelteMap<string, GeoreferencedMap>>(
    new SvelteMap()
  )

  #mapsFromUrl = $state<SvelteMap<string, GeoreferencedMap>>(new SvelteMap())

  #maps = $derived(
    new SvelteMap([...this.#mapsFromCoordinates, ...this.#mapsFromUrl])
  )

  #mapsWithImageInfo = $derived.by<MapWithImageInfo[]>(() => {
    const mapsWithImageInfo: MapWithImageInfo[] = []

    for (const [mapId, map] of this.#maps) {
      const fetchedImageInfo = this.#imageInfoState.imageInfoByUrl.get(
        map.resource.id
      )
      if (fetchedImageInfo && fetchedImageInfo.state === 'success') {
        mapsWithImageInfo.push({
          mapId,
          map,
          imageInfo: fetchedImageInfo.imageInfo
        })
      }
    }

    return mapsWithImageInfo
  })

  constructor(
    sensorsState: SensorsState,
    imageInfoState: ImageInfoState,
    errorState: ErrorState,
    uiState: UiState
  ) {
    this.#sensorsState = sensorsState
    this.#imageInfoState = imageInfoState
    this.#uiState = uiState

    $effect(() => {
      const newPosition = this.#sensorsState.position

      if (!newPosition) {
        return
      }

      if (this.#lastPosition) {
        const diffTimestamp =
          newPosition.timestamp - this.#lastPosition.timestamp
        const diffDistance = computePositionDistance(
          newPosition,
          this.#lastPosition
        )

        if (
          diffTimestamp < THRESHOLD_TIMESTAMP ||
          diffDistance < THRESHOLD_DISTANCE
        ) {
          return
        }
      }

      this.fetchMapsFromCoordinates(newPosition).catch(
        (err) => (errorState.error = err)
      )

      this.#lastPosition = newPosition
    })
  }

  #getMapId(map: GeoreferencedMap) {
    if (map.id) {
      return map.id
    } else {
      throw new Error('Map has no ID')
    }
  }

  async fetchMapsFromCoordinates(position: GeolocationPosition) {
    this.#loading = true

    const {
      coords: { latitude, longitude }
    } = position

    const url = `${env.PUBLIC_ANNOTATIONS_URL}/maps?limit=${NEARBY_MAPS_COUNT}&intersects=${[
      latitude,
      longitude
    ].join(',')}&maxarea=${MAX_AREA}`

    const annotations = await fetchJson(url)
    const maps = parseAnnotation(annotations)

    this.#mapsFromCoordinates = new SvelteMap(
      maps.map((map) => [this.#getMapId(map), map])
    )

    this.#fetchCount += 1
    this.#loading = false
    this.#lastPosition = position

    // Reset scroll position when new maps are loaded
    this.#uiState.mapsScrollTop = 0
  }

  get mapsFromCoordinates() {
    return this.#mapsFromCoordinates
  }

  get maps() {
    return this.#maps
  }

  get mapsWithImageInfo() {
    return this.#mapsWithImageInfo
  }

  getPreviousMapId(mapId: string) {
    const index = this.#mapsWithImageInfo.findIndex(
      (mapWithImageInfo) => mapWithImageInfo.map.id === mapId
    )

    if (index > -1) {
      return this.#mapsWithImageInfo[
        (index - 1 + this.#mapsWithImageInfo.length) %
          this.#mapsWithImageInfo.length
      ].map.id
    }
  }

  getNextMapId(mapId: string) {
    const index = this.#mapsWithImageInfo.findIndex(
      (mapWithImageInfo) => mapWithImageInfo.map.id === mapId
    )

    if (index > -1) {
      return this.#mapsWithImageInfo[
        (index + 1 + this.#mapsWithImageInfo.length) %
          this.#mapsWithImageInfo.length
      ].map.id
    }
  }

  getMapWithImageInfo(mapId: string) {
    return this.#mapsWithImageInfo.find(
      (mapWithImageInfo) => mapWithImageInfo.mapId === mapId
    )
  }

  get loading() {
    return this.#loading
  }

  get fetchCount() {
    return this.#fetchCount
  }
}

export function setMapsState(
  sensorsState: SensorsState,
  imageInfoState: ImageInfoState,
  errorState: ErrorState,
  uiState: UiState
) {
  return setContext(
    MAPS_KEY,
    new MapsState(sensorsState, imageInfoState, errorState, uiState)
  )
}

export function getMapsState() {
  const mapsState = getContext<ReturnType<typeof setMapsState>>(MAPS_KEY)

  if (!mapsState) {
    throw new Error('MapsState is not set')
  }

  return mapsState
}
