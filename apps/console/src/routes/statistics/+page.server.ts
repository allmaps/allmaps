import { restFetch } from '$lib/server/rest.js'
import type { Statistics } from '$lib/types.js'
import type { PageServerLoad } from './$types'
export const load: PageServerLoad = async () => ({
  statistics: await restFetch<Statistics>('/statistics')
})
