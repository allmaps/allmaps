import { truncate } from '$lib/shared/strings.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
export {
  findYearInCanvas,
  findYearInManifest,
  findYearsInMetadata
} from '@allmaps/iiif-inspector'

import type { SourceType } from '$lib/types/shared.js'

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

function isValidLabel(label: string): boolean {
  const trimmedLabel = label.trim()

  if (!trimmedLabel) {
    return false
  } else if (label.trim() === '-') {
    return false
  }

  return true
}

export function formatLabels(labels: string[], maxLength = 64): string {
  const truncatedLabels = labels.filter(isValidLabel).map((label) =>
    truncate(label.trim(), {
      maxLength: maxLength / labels.length,
      toNearestSpace: true
    })
  )

  const uniqLabels = [...new Set(truncatedLabels)]

  return uniqLabels.join(' / ')
}

export function formatSourceType(sourceType: SourceType, plural = false) {
  if (sourceType === 'image') {
    return plural ? 'Images' : 'Image'
  } else if (sourceType === 'manifest') {
    return plural ? 'Manifests' : 'Manifest'
  } else if (sourceType === 'collection') {
    return plural ? 'Collections' : 'Collection'
  }
}

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

export function getTimeAgo(map: GeoreferencedMap) {
  return formatTimeAgo(map.modified)
}

export function formatNavDate(navDate?: Date): string {
  if (!navDate) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(navDate)
}
