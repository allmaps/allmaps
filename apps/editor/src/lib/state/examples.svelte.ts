import { setContext, getContext } from 'svelte'

import { SvelteMap } from 'svelte/reactivity'

import {
  fetchExampleOrganizations,
  fetchUngeoreferencedImages,
  getApiResourceId,
  imagesToExamples,
  isCallbackAllowedByOrganizations,
  ORGANIZATION_EXAMPLES_COUNT,
  shuffleImages
} from '$lib/shared/examples.js'

import type { ApiOrganization } from '$lib/shared/examples.js'
import type { Example } from '$lib/types/shared.js'

const EXAMPLES_KEY = Symbol('maps-history')

export class ExamplesState {
  #restBaseUrl: string

  #organizations = $state<ApiOrganization[]>([])
  #organizationsFetched = false
  #organizationsPromise: Promise<ApiOrganization[]> | undefined

  #examplesByOrganizationId = $state<SvelteMap<string, Example[]>>(
    new SvelteMap()
  )
  #exampleCountsByOrganizationId = new Map<string, number>()
  #examplePromisesByOrganizationId = new Map<
    string,
    { count: number; promise: Promise<Example[]> }
  >()

  constructor(restBaseUrl: string) {
    this.#restBaseUrl = restBaseUrl
  }

  setOrganizations(organizations: ApiOrganization[]) {
    this.#organizations = organizations
    this.#organizationsFetched = true
  }

  async getOrganizations() {
    if (this.#organizationsFetched) {
      return this.#organizations
    }

    this.#organizationsPromise ??= fetchExampleOrganizations(
      fetch,
      this.#restBaseUrl
    ).then((organizations) => {
      this.setOrganizations(organizations)
      return organizations
    })

    return this.#organizationsPromise
  }

  async fetchExamples(organization: ApiOrganization, count: number) {
    const organizationId = getApiResourceId(organization.id)
    const fetchCount = Math.max(count, ORGANIZATION_EXAMPLES_COUNT)
    const images = await fetchUngeoreferencedImages(
      fetch,
      organization,
      fetchCount
    )
    const examples = imagesToExamples(organization, shuffleImages(images))

    this.#exampleCountsByOrganizationId.set(organizationId, fetchCount)
    this.#examplePromisesByOrganizationId.delete(organizationId)

    this.#examplesByOrganizationId.set(organizationId, examples)

    return examples
  }

  async getExamplesByOrganization(
    organization: ApiOrganization,
    count: number
  ) {
    const organizationId = getApiResourceId(organization.id)
    const examples = this.#examplesByOrganizationId.get(organizationId) || []
    const fetchedCount = this.#exampleCountsByOrganizationId.get(organizationId)

    if (examples.length >= count || (fetchedCount ?? 0) >= count) {
      return examples.slice(0, count)
    }

    const currentPromise =
      this.#examplePromisesByOrganizationId.get(organizationId)

    if (currentPromise && currentPromise.count >= count) {
      return (await currentPromise.promise).slice(0, count)
    }

    const promise = this.fetchExamples(organization, count)
    this.#examplePromisesByOrganizationId.set(organizationId, {
      count,
      promise
    })

    return (await promise).slice(0, count)
  }

  isCallbackValid(callback: string) {
    return isCallbackAllowedByOrganizations(callback, this.#organizations)
  }

  get allExamples() {
    return Array.from(this.#examplesByOrganizationId.values()).flat()
  }
}

export function setExamplesState(restBaseUrl: string) {
  return setContext(EXAMPLES_KEY, new ExamplesState(restBaseUrl))
}

export function getExamplesState() {
  const examplesState =
    getContext<ReturnType<typeof setExamplesState>>(EXAMPLES_KEY)

  if (!examplesState) {
    throw new Error('ExamplesState is not set')
  }

  return examplesState
}
