import type { StatisticsHistory } from './types.js'

export function downloadStatistics(
  history: StatisticsHistory,
  format: 'csv' | 'ndjson'
) {
  const rows = history.periods
  const columns: (keyof StatisticsHistory['periods'][number])[] = [
    'period',
    'mapsAdded',
    'imagesAdded',
    'manifestsAdded',
    'imagesFirstGeoreferenced',
    'maps',
    'images',
    'manifests',
    'georeferencedImages',
    'ungeoreferencedImages',
    'imagesWithoutManifest',
    'stockDay',
    'measuredAt',
    'georeferencedPercentage',
    'availableDays'
  ]
  const quote = (value: unknown) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`
  const text =
    format === 'csv'
      ? [
          columns.map(quote).join(','),
          ...rows.map((row) => columns.map((key) => quote(row[key])).join(','))
        ].join('\r\n') + '\r\n'
      : rows.map((row) => JSON.stringify(row)).join('\n') +
        (rows.length ? '\n' : '')
  const blob = new Blob([text], {
    type:
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/x-ndjson;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `allmaps-statistics-${history.from}-${history.through}-${history.interval}.${format}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
