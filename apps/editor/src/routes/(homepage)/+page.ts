import { browser } from '$app/environment'

import {
  fetchExampleOrganizations,
  fetchRandomOrganizationImages,
  HOMEPAGE_EXAMPLES_COUNT,
  HOMEPAGE_ORGANIZATION_COUNT,
  imagesToExamplesByOrganizationId,
  shuffleOrganizations
} from '$lib/shared/examples.js'
import {
  getHomepageExamplesData,
  setHomepageExamplesData
} from '$lib/shared/homepage-examples-cache.js'

import type { ExamplesByOrganizationId } from '$lib/shared/examples.js'
import type { HomepageExamplesData } from '$lib/shared/homepage-examples-cache.js'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, parent }) => {
  const cachedData = getHomepageExamplesData()

  if (cachedData) {
    return cachedData
  }

  const { env, homepageExamplesSeed } = await parent()
  const organizations = shuffleOrganizations(
    await fetchExampleOrganizations(fetch, env.PUBLIC_REST_BASE_URL),
    homepageExamplesSeed
  )
  const initialOrganizations = organizations.slice(
    0,
    HOMEPAGE_ORGANIZATION_COUNT
  )

  let examplesByOrganizationId: ExamplesByOrganizationId = {}
  let examplesLoaded = false

  try {
    const images = await fetchRandomOrganizationImages(
      fetch,
      env.PUBLIC_REST_BASE_URL,
      initialOrganizations,
      HOMEPAGE_EXAMPLES_COUNT
    )
    examplesByOrganizationId = imagesToExamplesByOrganizationId(images)
    examplesLoaded = true
  } catch (error) {
    console.error('Failed to fetch initial organization examples', error)
  }

  const data: HomepageExamplesData = {
    organizations,
    examplesByOrganizationId,
    visibleOrganizationCount: HOMEPAGE_ORGANIZATION_COUNT
  }

  if (browser && examplesLoaded) {
    setHomepageExamplesData(data)
  }

  return {
    ...data,
    examplesLoaded
  }
}
