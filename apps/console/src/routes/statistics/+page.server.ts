import { restFetch } from '$lib/server/rest.js'
import { loadStatisticsHistory } from '$lib/server/statistics.js'
import type { Statistics } from '$lib/types.js'
import type { PageServerLoad } from './$types'
export const load: PageServerLoad = async ({ url }) => {
  const [statistics, history] = await Promise.all([
    restFetch<Statistics>('/statistics'),
    loadStatisticsHistory(url, '/statistics')
  ])
  return { statistics, history }
}
