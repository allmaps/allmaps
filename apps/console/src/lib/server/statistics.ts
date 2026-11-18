import { error } from '@sveltejs/kit'
import { restFetch } from './rest.js'
import {
  resolveStatisticsPeriod,
  statisticsInterval
} from '$lib/statistics-periods.js'
import type { StatisticsHistory } from '$lib/types.js'

export async function loadStatisticsHistory(url: URL, apiPath: string) {
  let selection
  try {
    selection = resolveStatisticsPeriod(url.searchParams)
  } catch {
    error(400, 'Unknown statistics period')
  }
  const grouping = url.searchParams.get('interval') ?? 'auto'
  const interval =
    grouping === 'auto'
      ? statisticsInterval(selection.from, selection.through)
      : grouping
  const view: NonNullable<StatisticsHistory['view']> =
    url.searchParams.get('view') === 'cumulative' ? 'cumulative' : 'period'
  const query = new URLSearchParams({
    from: selection.from,
    through: selection.through,
    interval
  })
  const history = await restFetch<StatisticsHistory>(
    `${apiPath}/history?${query}`
  )
  return { ...history, period: selection.period, grouping, view }
}
