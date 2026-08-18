import { restFetch } from '$lib/server/rest.js'

import type { ListSummary } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return {
    lists: await restFetch<ListSummary[]>('/lists')
  }
}
