import { setContext, getContext } from 'svelte'

import { SvelteMap } from 'svelte/reactivity'

import { uniqBy } from 'lodash-es'

import type { Example } from '$lib/types/shared.js'

const EXAMPLES_KEY = Symbol('maps-history')

export class ExamplesState {
  #examplesApiUrl: string

  #examplesByOrganizationId = $state<SvelteMap<string, Example[]>>(
    new SvelteMap()
  )

  constructor(examplesApiUrl: string) {
    this.#examplesApiUrl = examplesApiUrl
  }

  async fetchExamples(organizationId: string, count: number) {
    // TODO: parse with Zod
    const fetchedExamples = (await fetch(
      `${this.#examplesApiUrl}/?org=${organizationId}&count=${count}`
    ).then((response) => response.json())) as Example[]

    const examples = uniqBy(fetchedExamples, 'imageId')

    this.#examplesByOrganizationId.set(organizationId, examples)

    return examples
  }

  async getExamplesByOrganization(organizationId: string, count: number) {
    const examples = this.#examplesByOrganizationId.get(organizationId) || []

    if (examples.length < count) {
      return await this.fetchExamples(organizationId, count)
    }

    return examples.slice(0, count)
  }

  get allExamples() {
    return Array.from(this.#examplesByOrganizationId.values()).flat()
  }
}

export function setExamplesState(examplesApiUrl: string) {
  return setContext(EXAMPLES_KEY, new ExamplesState(examplesApiUrl))
}

export function getExamplesState() {
  const examplesState =
    getContext<ReturnType<typeof setExamplesState>>(EXAMPLES_KEY)

  if (!examplesState) {
    throw new Error('ExamplesState is not set')
  }

  return examplesState
}
