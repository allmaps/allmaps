import { restFetch } from './rest.js'
import type { StatisticsHistory } from '$lib/types.js'

export async function loadStatisticsHistory(url: URL, apiPath: string) {
  const today = new Date().toISOString().slice(0, 10)
  const from =
    url.searchParams.get('from') ??
    new Date(Date.parse(today) - 30 * 86400000).toISOString().slice(0, 10)
  const through = url.searchParams.get('through') ?? today
  const interval = url.searchParams.get('interval') ?? 'day'
  const query = new URLSearchParams({ from, through, interval })
  return restFetch<StatisticsHistory>(`${apiPath}/history?${query}`)
}
