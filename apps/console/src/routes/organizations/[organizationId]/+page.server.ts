import { restFetch } from '$lib/server/rest.js'

import type { Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  return {
    organizationId: params.organizationId,
    organization: await restFetch<Organization>(
      `/organizations/${params.organizationId}`
    )
  }
}
