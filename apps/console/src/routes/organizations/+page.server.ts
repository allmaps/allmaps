import { restFetch } from '$lib/server/rest.js'

import type { Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return {
    organizations: await restFetch<Organization[]>('/organizations')
  }
}
