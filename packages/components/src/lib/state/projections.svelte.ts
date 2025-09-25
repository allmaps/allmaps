import { setContext, getContext } from 'svelte'

import type { PickerProjection } from '@allmaps/components/projections'

const PROJECTIONS_KEY = Symbol('projections')

const PROJECTIONS_URL = 'https://pages.allmaps.org/projections/projections.json'

export class ProjectionsState {
  #projections = $state.raw<PickerProjection[]>()
  #fetching = false

  async #fetchProjections() {
    if (this.#fetching) {
      return
    }

    this.#fetching = true

    fetch(PROJECTIONS_URL)
      .then((response) => response.json())
      .then((data) => (this.#projections = data as PickerProjection[]))
      .finally(() => (this.#fetching = false))
  }

  get projections() {
    if (!this.#projections) {
      this.#fetchProjections()
      return []
    } else {
      return this.#projections
    }
  }
}

export function setProjectionsState() {
  return setContext(PROJECTIONS_KEY, new ProjectionsState())
}

export function getProjectionsState() {
  const projectionsState =
    getContext<ReturnType<typeof setProjectionsState>>(PROJECTIONS_KEY)

  if (!projectionsState) {
    throw new Error('ProjectionsState is not set')
  }

  return projectionsState
}
