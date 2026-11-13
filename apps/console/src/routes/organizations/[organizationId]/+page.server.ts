import { loadStatisticsHistory } from '$lib/server/statistics.js'
import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'
import type { Organization, Statistics } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, url }) => {
  const organizationId = parseResourceId(params.organizationId, 'Organization')
  const path = `/organizations/${encodeURIComponent(organizationId)}`
  const [organization, statistics, history] = await Promise.all([
    restFetch<Organization>(path),
    restFetch<Statistics>(`${path}/statistics`),
    loadStatisticsHistory(url, `${path}/statistics`)
  ])
  return { organizationId, organization, statistics, history }
}
