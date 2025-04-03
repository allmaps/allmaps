import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchJson } from '@allmaps/stdlib'
import { parseAnnotation } from '@allmaps/annotation'

// import { PUBLIC_ANNOTATIONS_URL } from '$env/static/public'

import { distance } from '$lib/shared/position.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { SensorsState } from '$lib/state/sensors.svelte.js'
import type { ImageInfoState } from '$lib/state/image-info.svelte.js'

import type { MapWithImageInfo } from '$lib/shared/types.ts'

const VITE_ANNOTATIONS_URL = import.meta.env.VITE_ANNOTATIONS_URL

const THRESHOLD_TIMESTAMP = 5000 // 5 seconds in milliseconds
const THRESHOLD_DISTANCE = 10 // 10 meters

const NEARBY_MAPS_COUNT = 40

const MAPS_KEY = Symbol('maps')

export class MapsState {
  #sensorsState: SensorsState
  #imageInfoState: ImageInfoState

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

  constructor(sensorsState: SensorsState, imageInfoState: ImageInfoState) {
    this.#sensorsState = sensorsState
    this.#imageInfoState = imageInfoState

    $effect(() => {
      const newPosition = this.#sensorsState.position

      if (!newPosition) {
        return
      }

      if (this.#lastPosition) {
        const diffTimestamp =
          newPosition.timestamp - this.#lastPosition.timestamp
        const diffDistance = distance(newPosition, this.#lastPosition)

        if (
          diffTimestamp < THRESHOLD_TIMESTAMP ||
          diffDistance < THRESHOLD_DISTANCE
        ) {
          return
        }
      }

      this.fetchMapsFromCoordinates(newPosition)
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

  #mapExists(mapId: string) {
    return this.#maps.has(mapId)
  }

  async fetchMapsFromCoordinates(position: GeolocationPosition) {
    const {
      coords: { latitude, longitude }
    } = position

    const url = `${VITE_ANNOTATIONS_URL}/maps?limit=${NEARBY_MAPS_COUNT}&intersects=${[
      latitude,
      longitude
    ].join(',')}`

    const annotations = await fetchJson(url)
    const maps = parseAnnotation(annotations)

    this.#mapsFromCoordinates = new SvelteMap(
      maps.map((map) => [this.#getMapId(map), map])
    )

    this.#lastPosition = position
  }

  async fetchMapFromMapId(mapId: string) {
    if (!mapId) {
      return
    }

    // If the map is already loaded, do nothing
    if (!this.#mapExists(mapId)) {
      const annotations = await fetchJson(mapId)
      const maps = parseAnnotation(annotations)

      this.#mapsFromUrl = new SvelteMap(
        maps.map((map) => [this.#getMapId(map), map])
      )

      return maps[0]
    } else {
      return this.#maps.get(mapId)
    }
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
}

export function setMapsState(
  sensorsState: SensorsState,
  imageInfoState: ImageInfoState
) {
  return setContext(MAPS_KEY, new MapsState(sensorsState, imageInfoState))
}

export function getMapsState() {
  const mapsState = getContext<ReturnType<typeof setMapsState>>(MAPS_KEY)

  if (!mapsState) {
    throw new Error('MapsState is not set')
  }

  return mapsState
}
