import { setContext, getContext } from 'svelte'

import { GcpTransformer } from '@allmaps/transform'

import { toResourceCoordinates } from '$lib/shared/transform.js'

import type { SensorsState } from '$lib/state/sensors.svelte.js'
import type { MapState } from '$lib/state/map.svelte.js'

const URL_KEY = Symbol('resource-transformer')

export class ResourceTransformerState {
  #sensorsState: SensorsState
  #mapState: MapState

  #transformer: GcpTransformer | undefined = $derived.by(() => {
    if (this.#mapState && this.#mapState.map) {
      try {
        // TODO: only create transformer if map is changed
        return new GcpTransformer(
          this.#mapState.map.gcps,
          this.#mapState.map.transformation?.type
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

  constructor(sensorsState: SensorsState, mapState: MapState) {
    this.#sensorsState = sensorsState
    this.#mapState = mapState
  }

  get transformer() {
    return this.#transformer
  }

  get resourcePosition() {
    return this.#resourcePosition
  }

  get resourcePositionInsideResource() {
    if (
      this.#resourcePosition &&
      this.#mapState.map?.resource.width &&
      this.#mapState.map?.resource.height
    ) {
      const [x, y] = this.#resourcePosition

      if (
        x < 0 ||
        y < 0 ||
        x > this.#mapState.map.resource.width ||
        y > this.#mapState.map.resource.height
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
  mapState: MapState
) {
  return setContext(
    URL_KEY,
    new ResourceTransformerState(sensorsState, mapState)
  )
}

export function getResourceTransformerState() {
  const resourseTransformerState =
    getContext<ReturnType<typeof setResourceTransformerState>>(URL_KEY)

  if (!resourseTransformerState) {
    throw new Error('ResourceTransformerState is not set')
  }

  return resourseTransformerState
}
