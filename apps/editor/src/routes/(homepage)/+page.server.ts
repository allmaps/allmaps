import {
  fetchExampleOrganizations,
  shuffleOrganizations
} from '$lib/shared/examples.js'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, parent }) => {
  const { env } = await parent()
  const organizations = await fetchExampleOrganizations(
    fetch,
    env.PUBLIC_REST_BASE_URL
  )

  return {
    organizations: shuffleOrganizations(organizations)
  }
}
