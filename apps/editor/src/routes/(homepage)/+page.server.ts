import {
  fetchExampleOrganizations,
  fetchRandomOrganizationImages,
  HOMEPAGE_EXAMPLES_COUNT,
  HOMEPAGE_ORGANIZATION_COUNT,
  imagesToExamplesByOrganizationId,
  shuffleOrganizations
} from '$lib/shared/examples.js'

import type { ExamplesByOrganizationId } from '$lib/shared/examples.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, parent }) => {
  const { env } = await parent()
  const organizations = shuffleOrganizations(
    await fetchExampleOrganizations(fetch, env.PUBLIC_REST_BASE_URL)
  )
  const initialOrganizations = organizations.slice(
    0,
    HOMEPAGE_ORGANIZATION_COUNT
  )

  let examplesByOrganizationId: ExamplesByOrganizationId = {}

  try {
    const images = await fetchRandomOrganizationImages(
      fetch,
      env.PUBLIC_REST_BASE_URL,
      initialOrganizations,
      HOMEPAGE_EXAMPLES_COUNT
    )
    examplesByOrganizationId = imagesToExamplesByOrganizationId(images)
  } catch (error) {
    console.error('Failed to fetch initial organization examples', error)
  }

  return {
    organizations,
    examplesByOrganizationId
  }
}
