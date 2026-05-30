import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'
import { wrap, transfer } from 'comlink'

import {
  BackGroundColorEvents,
  BackgroundColorEventTarget
} from '$lib/shared/background-color-events.js'

import type { Remote } from 'comlink'

import type { Ring, Size } from '@allmaps/types'

import type { BackgroundColorWorkerType } from '$lib/workers/background-color.worker.js'

import type { ImagesState } from '$lib/state/images.svelte.js'
import type { SourceState } from '$lib/state/source.svelte.js'

import BackgroundColorWorker from '$lib/workers/background-color.worker.ts?worker'

const BACKGROUND_COLORS_KEY = Symbol('background-colors')

export class BackgroundColorsState extends BackgroundColorEventTarget {
  #sourceState: SourceState
  #imagesState: ImagesState

  #paused = $state(false)

  #backgroundColors = $state(new SvelteMap<string, [number, number, number]>())
  #computingIds = new Set<string>()
  #worker: Remote<BackgroundColorWorkerType>

  constructor(
    sourceState: SourceState,
    imagesState: ImagesState,
    paused: boolean
  ) {
    super()

    this.#sourceState = sourceState
    this.#imagesState = imagesState
    this.#paused = paused

    this.#worker = wrap<BackgroundColorWorkerType>(new BackgroundColorWorker())

    $effect(() => {
      if (this.#paused) {
        return
      }

      for (const map of this.#sourceState.maps) {
        const mapId = map.id!
        const imageId = map.resource.id

        if (
          this.#backgroundColors.has(mapId) ||
          this.#computingIds.has(mapId)
        ) {
          continue
        }

        const thumbnail = this.#imagesState.thumbnails.get(imageId)

        if (!map.resource.width || !map.resource.height) {
          continue
        }

        if (!thumbnail) {
          continue
        }

        const resourceSize: Size = [map.resource.width, map.resource.height]

        this.#computeBackgroundColor(
          mapId,
          resourceSize,
          thumbnail,
          map.resourceMask
        )
      }
    })
  }

  pause() {
    this.#paused = true
  }

  resume() {
    this.#paused = false
  }

  async #computeBackgroundColor(
    mapId: string,
    resourceSize: Size,
    thumbnail: ImageBitmap,
    resourceMask?: Ring
  ) {
    this.#computingIds.add(mapId)
    try {
      const clonedThumbnail = await createImageBitmap(thumbnail)
      const plainResourceMask = $state.snapshot(resourceMask)

      const color = await this.#worker.computeBackgroundColor(
        resourceSize,
        transfer(clonedThumbnail, [clonedThumbnail]),
        plainResourceMask
      )

      if (this.#sourceState.maps.some((map) => map.id === mapId)) {
        this.#backgroundColors.set(mapId, color)
        this.dispatchEvent(
          new CustomEvent(BackGroundColorEvents.BACKGROUND_COLOR_CHANGE, {
            detail: { mapId, backgroundColor: color }
          })
        )
      }
    } catch (error) {
      console.warn(
        `Unable to compute background color for map ${mapId}:`,
        error
      )
    } finally {
      this.#computingIds.delete(mapId)
    }
  }

  getBackgroundColorForMap(mapId: string) {
    return this.#backgroundColors.get(mapId)
  }
}

export function setBackgroundColorsState(
  sourceState: SourceState,
  imagesState: ImagesState,
  paused = true
) {
  return setContext(
    BACKGROUND_COLORS_KEY,
    new BackgroundColorsState(sourceState, imagesState, paused)
  )
}

export function getBackgroundColorsState() {
  const backgroundColorsState = getContext<BackgroundColorsState>(
    BACKGROUND_COLORS_KEY
  )
  if (!backgroundColorsState) {
    throw new Error('BackgroundColorsState is not set')
  }

  return backgroundColorsState
}
