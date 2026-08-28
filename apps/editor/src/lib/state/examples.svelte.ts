import { setContext, getContext } from 'svelte'

import { SvelteMap, SvelteSet } from 'svelte/reactivity'

import {
  fetchExampleOrganizations,
  fetchRandomOrganizationImages,
  getApiResourceId,
  HOMEPAGE_EXAMPLES_COUNT,
  HOMEPAGE_ORGANIZATION_COUNT,
  imagesToExamplesByOrganizationId,
  isCallbackAllowedByOrganizations,
  shuffleOrganizations
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
  #fetchedExampleOrganizationIds = new SvelteSet<string>()

  #homepageExamplesPromise: Promise<void> | undefined
  #homepageLoading = $state(false)
  #homepageLoadingMore = $state(false)
  #homepageFailed = $state(false)
  #visibleHomepageOrganizationCount = $state(HOMEPAGE_ORGANIZATION_COUNT)

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
    )
      .then((organizations) => {
        const shuffledOrganizations = shuffleOrganizations(organizations)
        this.setOrganizations(shuffledOrganizations)
        return shuffledOrganizations
      })
      .catch((error) => {
        this.#organizationsPromise = undefined
        throw error
      })

    return this.#organizationsPromise
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
      this.#fetchedExampleOrganizationIds.add(organizationId)
    }

    return examplesByOrganizationId
  }

  async loadHomepageExamples() {
    if (this.#homepageExamplesPromise) {
      return this.#homepageExamplesPromise
    }

    const visibleOrganizations = this.visibleHomepageOrganizations
    if (
      visibleOrganizations.length > 0 &&
      visibleOrganizations.every((organization) =>
        this.hasFetchedExamplesByOrganization(organization)
      )
    ) {
      return
    }

    this.#homepageLoading = true
    this.#homepageFailed = false

    const promise = (async () => {
      const organizations = await this.getOrganizations()
      const organizationsToFetch = organizations
        .slice(0, this.#visibleHomepageOrganizationCount)
        .filter(
          (organization) => !this.hasFetchedExamplesByOrganization(organization)
        )

      await this.fetchExamplesByOrganizations(
        organizationsToFetch,
        HOMEPAGE_EXAMPLES_COUNT
      )
    })()

    this.#homepageExamplesPromise = promise

    try {
      await promise
    } catch (error) {
      this.#homepageFailed = true
      throw error
    } finally {
      this.#homepageLoading = false
      this.#homepageExamplesPromise = undefined
    }
  }

  async showMoreHomepageOrganizations() {
    if (this.#homepageLoading || this.#homepageLoadingMore) {
      return
    }

    const nextOrganizations = this.#organizations.slice(
      this.#visibleHomepageOrganizationCount,
      this.#visibleHomepageOrganizationCount + HOMEPAGE_ORGANIZATION_COUNT
    )

    if (nextOrganizations.length === 0) {
      return
    }

    this.#homepageLoadingMore = true

    try {
      await this.fetchExamplesByOrganizations(
        nextOrganizations,
        HOMEPAGE_EXAMPLES_COUNT
      )
      this.#visibleHomepageOrganizationCount = Math.min(
        this.#visibleHomepageOrganizationCount + HOMEPAGE_ORGANIZATION_COUNT,
        this.#organizations.length
      )
    } finally {
      this.#homepageLoadingMore = false
    }
  }

  getExamplesByOrganization(organization: ApiOrganization) {
    const organizationId = getApiResourceId(organization.id)
    return this.#examplesByOrganizationId.get(organizationId) ?? []
  }

  hasFetchedExamplesByOrganization(organization: ApiOrganization) {
    return this.#fetchedExampleOrganizationIds.has(
      getApiResourceId(organization.id)
    )
  }

  isCallbackValid(callback: string) {
    return isCallbackAllowedByOrganizations(callback, this.#organizations)
  }

  get allExamples() {
    return Array.from(this.#examplesByOrganizationId.values()).flat()
  }

  get organizations() {
    return this.#organizations
  }

  get visibleHomepageOrganizations() {
    return this.#organizations.slice(0, this.#visibleHomepageOrganizationCount)
  }

  get hasMoreHomepageOrganizations() {
    return this.#visibleHomepageOrganizationCount < this.#organizations.length
  }

  get homepageLoading() {
    return this.#homepageLoading
  }

  get homepagePending() {
    return (
      !this.#homepageFailed &&
      (!this.#organizationsFetched ||
        this.#homepageLoading ||
        this.visibleHomepageOrganizations.some(
          (organization) => !this.hasFetchedExamplesByOrganization(organization)
        ))
    )
  }

  get homepageLoadingMore() {
    return this.#homepageLoadingMore
  }

  get homepageFailed() {
    return this.#homepageFailed
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
