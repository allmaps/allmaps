import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'

import type { ListDetail } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const listId = parseResourceId(params.listId, 'List')

  return {
    listId,
    list: await restFetch<ListDetail>(`/lists/${encodeURIComponent(listId)}`)
  }
}
