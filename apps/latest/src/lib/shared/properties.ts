import type { Map } from '@allmaps/annotation'
import type { Polygon } from 'geojson'

const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto'
})

type Division = {
  amount: number
  name: Intl.RelativeTimeFormatUnit
}

const divisions: Division[] = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' }
]

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) {
    return
  }

  const date = new Date(dateStr)

  // From https://blog.webdevsimplified.com/2020-07/relative-time-format/
  let duration = (date.getTime() - new Date().getTime()) / 1000
  for (let i = 0; i <= divisions.length; i++) {
    const division = divisions[i]
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name)
    }
    duration /= division.amount
  }
}

export function getProperties(map: Map, apiMap: unknown, polygon?: Polygon) {
  // TODO: create new type for API output
  // maybe with https://github.com/trpc/trpc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  const { hostname } = new URL(map.resource.id)
  const timeAgo = formatTimeAgo(map.modified)

  type _Allmaps = {
    area: number
  }

  let areaStr
  if (apiMap && typeof apiMap === 'object' && '_allmaps' in apiMap) {
    const _allmaps = apiMap._allmaps as _Allmaps
    const areaSqKm = _allmaps.area / (1000 * 1000)

    let maximumFractionDigits = 0
    if (areaSqKm < 1) {
      maximumFractionDigits = 3
    } else if (areaSqKm < 10) {
      maximumFractionDigits = 2
    } else if (areaSqKm < 20) {
      maximumFractionDigits = 1
    }

    areaStr = `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits
    }).format(areaSqKm)} km²`
  }

  return {
    hostname,
    timeAgo,
    areaStr
  }
}
