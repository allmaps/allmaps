import { browser } from '$app/environment'

import type {
  ApiOrganization,
  ExamplesByOrganizationId
} from '$lib/shared/examples.js'

export type HomepageExamplesData = {
  organizations: ApiOrganization[]
  examplesByOrganizationId: ExamplesByOrganizationId
  visibleOrganizationCount: number
}

let homepageExamplesData: HomepageExamplesData | undefined

export function getHomepageExamplesData() {
  return browser ? homepageExamplesData : undefined
}

export function setHomepageExamplesData(data: HomepageExamplesData) {
  if (browser) {
    homepageExamplesData = data
  }
}

export function updateHomepageExamplesData(
  examplesByOrganizationId: ExamplesByOrganizationId,
  visibleOrganizationCount: number
) {
  if (!browser || !homepageExamplesData) {
    return
  }

  homepageExamplesData = {
    ...homepageExamplesData,
    examplesByOrganizationId: {
      ...homepageExamplesData.examplesByOrganizationId,
      ...examplesByOrganizationId
    },
    visibleOrganizationCount
  }
}
