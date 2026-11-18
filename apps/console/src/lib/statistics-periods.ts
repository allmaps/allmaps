// Inclusive UTC dates, matching the statistics API's day boundaries.
export const statisticsPeriods = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '365d', label: 'Last 365 days', days: 365 },
  { value: 'month', label: 'This month' },
  { value: 'previous-month', label: 'Previous month' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' }
] as const

export type StatisticsPeriod = (typeof statisticsPeriods)[number]['value']

export function resolveStatisticsPeriod(
  search: URLSearchParams,
  now = new Date()
) {
  const period =
    search.get('period') ??
    (search.has('from') || search.has('through') ? 'custom' : '30d')
  const selected = statisticsPeriods.find((option) => option.value === period)
  if (!selected) throw new RangeError('Unknown statistics period')
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const iso = (date: Date) => date.toISOString().slice(0, 10)
  let from = new Date(today)
  let through = new Date(today)
  if ('days' in selected) from.setUTCDate(from.getUTCDate() - selected.days + 1)
  else if (selected.value === 'month') from.setUTCDate(1)
  else if (selected.value === 'previous-month') {
    from = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
    )
    through = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
  } else if (selected.value === 'year')
    from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1))
  else if (selected.value === 'custom') {
    return {
      period: selected.value,
      from: search.get('from') ?? iso(new Date(+today - 29 * 86400000)),
      through: search.get('through') ?? iso(today)
    }
  }
  return { period: selected.value, from: iso(from), through: iso(through) }
}

export function statisticsInterval(from: string, through: string) {
  const days = (Date.parse(through) - Date.parse(from)) / 86400000 + 1
  return days <= 60 ? 'day' : days <= 365 ? 'week' : 'month'
}
