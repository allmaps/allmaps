import { setContext, getContext } from 'svelte'

import { SvelteMap } from 'svelte/reactivity'

import type { SourceState } from '$lib/state/source.svelte'

import type { View, Viewport } from '$lib/types/shared.js'

const VIEWPORTS_KEY = Symbol('viewports')

type Path =
  | { view: View }
  | { view: View; imageId: string }
  | { view: View; imageId: string; mapId: string; pane: string }

export class ViewportsState {
  #lastSourceUrl: string | undefined

  #viewports = new SvelteMap<string, Viewport>()

  constructor(sourceState: SourceState) {
    $effect(() => {
      if (this.#lastSourceUrl !== sourceState.source?.url) {
        this.#viewports.clear()
      }

      this.#lastSourceUrl = sourceState.source?.url
    })
  }

  #getKey(path: Path) {
    return JSON.stringify({
      view: path.view,
      imageId: 'imageId' in path ? path.imageId : undefined,
      mapId: 'mapId' in path ? path.mapId : undefined,
      pane: 'pane' in path ? path.pane : undefined
    })
  }

  getViewport(path: Path): Viewport | undefined {
    return this.#viewports.get(this.#getKey(path))
  }

  saveViewport(path: Path, viewport: Viewport) {
    this.#viewports.set(this.#getKey(path), viewport)
  }
}

export function setViewportsState(sourceState: SourceState) {
  return setContext(VIEWPORTS_KEY, new ViewportsState(sourceState))
}

export function getViewportsState() {
  const viewportsState =
    getContext<ReturnType<typeof setViewportsState>>(VIEWPORTS_KEY)

  if (!viewportsState) {
    throw new Error('ViewportsState is not set')
  }

  return viewportsState
}
