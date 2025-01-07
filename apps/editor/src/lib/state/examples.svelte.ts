import { setContext, getContext } from 'svelte'

import { SvelteMap } from 'svelte/reactivity'

import { uniqBy } from 'lodash-es'

import { PUBLIC_EXAMPLES_API_URL } from '$env/static/public'

import type { Example } from '$lib/types/shared.js'

const EXAMPLES_KEY = Symbol('maps-history')

export class ExamplesState {
  #examplesByOrganizationId = $state<SvelteMap<string, Example[]>>(
    new SvelteMap()
  )

  async fetchExamples(organizationId: string, count: number) {
    const fetchedExamples = (await fetch(
      `${PUBLIC_EXAMPLES_API_URL}/?org=${organizationId}&count=${count}`
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
}

export function setExamplesState() {
  return setContext(EXAMPLES_KEY, new ExamplesState())
}

export function getExamplesState() {
  const examplesState =
    getContext<ReturnType<typeof setExamplesState>>(EXAMPLES_KEY)

  if (!examplesState) {
    throw new Error('ExamplesState is not set')
  }

  return examplesState
}
