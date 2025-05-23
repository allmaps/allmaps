import { setContext, getContext } from 'svelte'

import { GcpTransformer } from '@allmaps/transform'

import { SensorsState } from '$lib/state/sensors.svelte.js'

import { toResourceCoordinates } from '$lib/shared/transform.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

const URL_KEY = Symbol('resource-transformer')

export class ResourceTransformerState {
  #sensorsState: SensorsState

  #map = $state.raw<GeoreferencedMap>()

  #transformer: GcpTransformer | undefined = $derived.by(() => {
    if (this.#map) {
      try {
        // TODO: only create transformer if map is changed
        return new GcpTransformer(
          this.#map.gcps,
          this.#map.transformation?.type
        )
      } catch (err) {
        console.error('Error creating transformer:', err)
      }
    }
  })

  #resourcePosition = $derived.by(() => {
    if (this.#transformer && this.#sensorsState.position) {
      return toResourceCoordinates(
        this.#transformer,
        this.#sensorsState.position
      )
    }
  })

  constructor(sensorsState: SensorsState, map?: GeoreferencedMap) {
    this.#sensorsState = sensorsState
    this.#map = map
  }

  get transformer() {
    return this.#transformer
  }

  get resourcePosition() {
    return this.#resourcePosition
  }

  get map() {
    return this.#map
  }

  set map(map: GeoreferencedMap | undefined) {
    this.#map = map
  }

  get resourcePositionInsideResource() {
    if (
      this.#resourcePosition &&
      this.#map?.resource.width &&
      this.#map?.resource.height
    ) {
      const [x, y] = this.#resourcePosition

      if (
        x < 0 ||
        y < 0 ||
        x > this.#map.resource.width ||
        y > this.#map.resource.height
      ) {
        return false
      }

      return true
    }

    return false
  }
}

export function setResourceTransformerState(
  sensorsState: SensorsState,
  map?: GeoreferencedMap
) {
  return setContext(URL_KEY, new ResourceTransformerState(sensorsState, map))
}

export function getResourceTransformerState() {
  const resourseTransformerState =
    getContext<ReturnType<typeof setResourceTransformerState>>(URL_KEY)

  if (!resourseTransformerState) {
    throw new Error('ResourceTransformerState is not set')
  }

  return resourseTransformerState
}
