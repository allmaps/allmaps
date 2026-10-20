import { createCatalog } from '$lib/server.ts'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ request }) => {
  return {
    catalog: createCatalog(request, 'cors')
  }
}
