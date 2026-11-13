import { restFetch } from '$lib/server/rest.js'
import { loadStatisticsHistory } from '$lib/server/statistics.js'
import type { Statistics, StatisticsOrganizations } from '$lib/types.js'
import type { PageServerLoad } from './$types'
export const load: PageServerLoad = async ({ url }) => {
  const [statistics, history, distribution] = await Promise.all([
    restFetch<Statistics>('/statistics'),
    loadStatisticsHistory(url, '/statistics'),
    restFetch<StatisticsOrganizations>('/statistics/organizations')
  ])
  return { statistics, history, distribution }
}
