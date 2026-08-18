import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'

import type { Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const organizationId = parseResourceId(params.organizationId, 'Organization')

  return {
    organizationId,
    organization: await restFetch<Organization>(
      `/organizations/${encodeURIComponent(organizationId)}`
    )
  }
}
