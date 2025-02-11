import { setContext, getContext } from 'svelte'

import type { View, Viewport } from '$lib/types/shared.js'

const VIEWPORTS_KEY = Symbol('viewports')

type Path =
  | { view: View }
  | { view: View; imageId: string }
  | { view: View; imageId: string; pane: string }

export class ViewportsState {
  #viewports = new Map<string, Viewport>()

  #getKey(path: Path) {
    return JSON.stringify({
      view: path.view,
      imageId: 'imageId' in path ? path.imageId : undefined,
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

export function setViewportsState() {
  return setContext(VIEWPORTS_KEY, new ViewportsState())
}

export function getViewportsState() {
  const viewportsState =
    getContext<ReturnType<typeof setViewportsState>>(VIEWPORTS_KEY)

  if (!viewportsState) {
    throw new Error('ViewportsState is not set')
  }

  return viewportsState
}
