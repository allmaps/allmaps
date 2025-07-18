import { setContext, getContext } from 'svelte'

import { browser } from '$app/environment'

import { throttle } from 'lodash-es'

import type { Point } from '@allmaps/types'

import type { ErrorState } from '$lib/state/error.svelte.ts'

import type { Orientation } from '$lib/shared/types.ts'

const SENSORS_KEY = Symbol('sensors')

const positionOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 27000
}

export class SensorsState {
  #errorState: ErrorState
  #abortController: AbortController
  #watchId: number | undefined

  #position = $state<GeolocationPosition>()
  #positionOverride = $state<Point>()

  #orientation = $state<Orientation>()
  #hasOrientation = $derived(
    this.#orientation !== undefined && this.#orientation.alpha !== null
  )

  #orientationAlpha = $derived(
    this.#orientation !== undefined && this.#orientation.alpha !== null
      ? this.#orientation.alpha
      : undefined
  )

  constructor(errorState: ErrorState) {
    this.#errorState = errorState

    this.#abortController = new AbortController()

    if (browser) {
      if ('geolocation' in navigator) {
        this.#watchId = navigator.geolocation.watchPosition(
          this.#handlePosition.bind(this),
          this.#handleError.bind(this),
          positionOptions
        )
      } else {
        this.#errorState.error = new Error('Geolocation API is not available')
      }

      if (window.DeviceOrientationEvent) {
        window.addEventListener(
          'deviceorientationabsolute',
          throttle(this.#handleDeviceOrientation.bind(this), 100),
          { signal: this.#abortController.signal }
        )
      }
    }
  }

  #handlePosition(position: GeolocationPosition) {
    this.#errorState.geolocationPositionError = undefined
    this.#position = position
  }

  #handleError(err: GeolocationPositionError) {
    this.#errorState.geolocationPositionError = err
  }

  #handleDeviceOrientation(event: DeviceOrientationEvent) {
    this.#orientation = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      absolute: event.absolute
    }
  }

  get position(): GeolocationPosition | undefined {
    if (this.#positionOverride) {
      return {
        coords: {
          longitude: this.#positionOverride[0],
          latitude: this.#positionOverride[1],
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
          toJSON: () => {}
        },
        timestamp: Date.now(),
        toJSON: () => {}
      }
    } else {
      return this.#position
    }
  }

  set position(position: Point | undefined) {
    this.#positionOverride = position
  }

  get orientation() {
    return this.#orientation
  }

  get hasOrientation() {
    return this.#hasOrientation
  }

  /*
   * Returns orientation of device
   * 0 is pointing north
   * 90 is pointing west
   * 180 is pointing south
   * 270 is pointing east
   */
  get orientationAlpha() {
    return this.#orientationAlpha
  }

  destroy() {
    if (this.#watchId !== undefined) {
      navigator.geolocation.clearWatch(this.#watchId)
    }
    this.#abortController.abort()
  }
}

export function setSensorsState(errorState: ErrorState) {
  return setContext(SENSORS_KEY, new SensorsState(errorState))
}

export function getSensorsState() {
  const sensorsState =
    getContext<ReturnType<typeof setSensorsState>>(SENSORS_KEY)

  if (!sensorsState) {
    throw new Error('SensorsState is not set')
  }

  return sensorsState
}
