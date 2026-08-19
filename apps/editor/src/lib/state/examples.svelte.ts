import { setContext, getContext } from 'svelte'

import { SvelteMap } from 'svelte/reactivity'

import {
  fetchExampleOrganizations,
  fetchRandomOrganizationImages,
  getApiResourceId,
  imagesToExamplesByOrganizationId,
  isCallbackAllowedByOrganizations
} from '$lib/shared/examples.js'

import type {
  ApiOrganization,
  ExamplesByOrganizationId
} from '$lib/shared/examples.js'
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

  setExamplesByOrganizationId(
    examplesByOrganizationId: ExamplesByOrganizationId
  ) {
    for (const [organizationId, examples] of Object.entries(
      examplesByOrganizationId
    )) {
      this.#examplesByOrganizationId.set(organizationId, examples)
    }
  }

  async fetchExamplesByOrganizations(
    organizations: ApiOrganization[],
    count: number
  ) {
    const images = await fetchRandomOrganizationImages(
      fetch,
      this.#restBaseUrl,
      organizations,
      count
    )
    const examplesByOrganizationId = imagesToExamplesByOrganizationId(images)

    for (const organization of organizations) {
      const organizationId = getApiResourceId(organization.id)
      this.#examplesByOrganizationId.set(
        organizationId,
        examplesByOrganizationId[organizationId] ?? []
      )
    }

    return examplesByOrganizationId
  }

  getExamplesByOrganization(organization: ApiOrganization) {
    const organizationId = getApiResourceId(organization.id)
    return this.#examplesByOrganizationId.get(organizationId) ?? []
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
