import { setContext, getContext } from 'svelte'

import type { PickerProjection } from '@allmaps/components/projections'

const PROJECTIONS_KEY = Symbol('projections')

export class ProjectionsState {
  #projectionsUrl: string

  #projections = $state.raw<PickerProjection[]>([])
  #projectionsById = $derived<Record<string, PickerProjection>>(
    Object.fromEntries(
      this.#projections.map((projection) => [projection.id, projection])
    )
  )

  #fetching = false

  #ready = $state(false)

  constructor(projectionsUrl: string) {
    this.#projectionsUrl = projectionsUrl
  }

  async fetchProjections() {
    if (this.#fetching || this.#ready) {
      return
    }

    this.#fetching = true
    fetch(this.#projectionsUrl)
      .then((response) => response.json())
      .then((data) => {
        this.#projections = data as PickerProjection[]
        this.#ready = true
      })
      .finally(() => (this.#fetching = false))
  }

  get projections() {
    if (!this.#ready) {
      this.fetchProjections()
      return []
    } else {
      return this.#projections
    }
  }

  get projectionsById() {
    return this.#projectionsById
  }

  get ready() {
    return this.#ready
  }
}

export function setProjectionsState(projectionsUrl: string) {
  return setContext(PROJECTIONS_KEY, new ProjectionsState(projectionsUrl))
}

export function getProjectionsState() {
  const projectionsState =
    getContext<ReturnType<typeof setProjectionsState>>(PROJECTIONS_KEY)

  if (!projectionsState) {
    throw new Error('ProjectionsState is not set')
  }

  return projectionsState
}
