import { setContext, getContext } from 'svelte'

import { computeGeoreferencedMapBearing } from '@allmaps/bearing'

import type { SensorsState } from '$lib/state/sensors.svelte.js'
import type { MapState } from '$lib/state/map.svelte.js'

import type { CompassMode } from '$lib/shared/types.ts'

const COMPASS_KEY = Symbol('compass')

export class CompassState {
  #sensorsState: SensorsState
  #mapState: MapState

  #compassMode = $state<CompassMode>('image')

  #customRotation = $state(0)

  #selectedMapBearing = $derived.by(() => {
    if (this.#mapState && this.#mapState.map) {
      try {
        return computeGeoreferencedMapBearing(this.#mapState.map)
      } catch (err) {
        console.error('Error computing map bearing:', err)
      }
    }
  })

  #rotation = $derived.by(() => {
    if (
      this.#compassMode === 'image' &&
      this.selectedMapBearing !== undefined
    ) {
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

    return undefined
  })

  constructor(sensorsState: SensorsState, mapState: MapState) {
    this.#sensorsState = sensorsState
    this.#mapState = mapState
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
  mapState: MapState
) {
  return setContext(COMPASS_KEY, new CompassState(sensorsState, mapState))
}

export function getCompassState() {
  const compassState =
    getContext<ReturnType<typeof setCompassState>>(COMPASS_KEY)

  if (!compassState) {
    throw new Error('CompassState is not set')
  }

  return compassState
}
