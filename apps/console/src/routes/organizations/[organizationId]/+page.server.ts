import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'

import type { Organization, Statistics } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const organizationId = parseResourceId(params.organizationId, 'Organization')

  return {
    organizationId,
    statistics: await restFetch<Statistics>(
      `/organizations/${encodeURIComponent(organizationId)}/statistics`
    ),
    organization: await restFetch<Organization>(
      `/organizations/${encodeURIComponent(organizationId)}`
    )
  }
}
