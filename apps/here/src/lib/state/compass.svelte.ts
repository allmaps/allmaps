import { setContext, getContext } from 'svelte'

import { computeGeoreferencedMapBearing } from '@allmaps/bearing'

import type { SensorsState } from '$lib/state/sensors.svelte.js'
import type { MapsState } from '$lib/state/maps.svelte.js'

import type { CompassMode } from '$lib/shared/types.ts'

const COMPASS_KEY = Symbol('compass')

export class CompassState {
  #sensorsState: SensorsState
  #mapsState: MapsState
  #selectedMapId = $state<string>()

  #customRotation = $state(0)
  #rotation = $derived.by(() => {
    if (this.#compassMode === 'image') {
      return this.#selectedMapBearing
    } else if (this.#compassMode === 'north') {
      return 0
    } else if (
      this.#compassMode === 'follow-orientation' &&
      this.#sensorsState.hasOrientation
    ) {
      const alpha = this.#sensorsState.orientation?.alpha
      if (alpha !== undefined && alpha !== null) {
        return alpha
      }
    } else if (this.#compassMode === 'custom') {
      return this.#customRotation
    }
  })

  #compassMode = $state<CompassMode>('image')

  #selectedMapBearing = $derived.by(() => {
    if (this.#selectedMapId) {
      const mapWithImageInfo = this.#mapsState.getMapWithImageInfo(
        this.#selectedMapId
      )

      if (mapWithImageInfo) {
        return computeGeoreferencedMapBearing(mapWithImageInfo.map)
      }
    }

    return 0
  })

  constructor(
    sensorsState: SensorsState,
    mapsState: MapsState,
    selectedMapId: string
  ) {
    this.#sensorsState = sensorsState
    this.#mapsState = mapsState
    this.#selectedMapId = selectedMapId
  }

  set selectedMapId(selectedMapId: string) {
    this.#selectedMapId = selectedMapId
  }

  get rotation() {
    return this.#rotation
  }

  set customRotation(rotation: number) {
    this.#customRotation = rotation
  }

  get compassMode() {
    return this.#compassMode
  }

  set compassMode(compassMode: CompassMode) {
    this.#compassMode = compassMode
  }

  get selectedMapBearing() {
    return this.#selectedMapBearing
  }

  nextCompassMode() {
    if (this.#compassMode === 'image') {
      this.#compassMode = 'north'
    } else if (this.#compassMode === 'north') {
      if (this.#sensorsState.hasOrientation) {
        this.#compassMode = 'follow-orientation'
      } else {
        this.#compassMode = 'image'
      }
    } else {
      this.#compassMode = 'image'
    }
  }
}

export function setCompassState(
  sensorsState: SensorsState,
  mapsState: MapsState,
  selectedMapId: string
) {
  return setContext(
    COMPASS_KEY,
    new CompassState(sensorsState, mapsState, selectedMapId)
  )
}

export function getCompassState() {
  const compassState =
    getContext<ReturnType<typeof setCompassState>>(COMPASS_KEY)

  if (!compassState) {
    throw new Error('CompassState is not set')
  }

  return compassState
}
