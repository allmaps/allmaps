import { restFetch } from '$lib/server/rest.js'
import { CONSOLE_LIST_LIMIT } from '$lib/limits.js'

import type { Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return {
    organizations: await restFetch<Organization[]>(
      `/organizations?limit=${CONSOLE_LIST_LIMIT}`
    )
  }
}
