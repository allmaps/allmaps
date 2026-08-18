import { restFetch } from '$lib/server/rest.js'

import type { ListDetail } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  return {
    listId: params.listId,
    list: await restFetch<ListDetail>(`/lists/${params.listId}`)
  }
}
