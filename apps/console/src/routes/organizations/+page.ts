import type { Organization } from '$lib/types.js'

import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, parent }) => {
  const { env } = await parent()

  const response = await fetch(`${env.PUBLIC_REST_BASE_URL}/organizations`, {
    credentials: 'include'
  })
  const organizations: Organization[] = response.ok ? await response.json() : []
  return { organizations }
}
