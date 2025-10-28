import { truncate } from '$lib/shared/strings.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  LanguageString,
  Metadata,
  Canvas as IIIFCanvas,
  Manifest as IIIFManifest
} from '@allmaps/iiif-parser'

import type { SourceType, IIIFPresentationResource } from '$lib/types/shared.js'

const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto'
})

type Division = {
  amount: number
  name: Intl.RelativeTimeFormatUnit
}

const YEAR_MIN = 1500
const YEAR_MAX = 2200

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

export function formatSourceType(sourceType: SourceType) {
  if (sourceType === 'image') {
    return 'Image'
  } else if (sourceType === 'manifest') {
    return 'Manifest'
  } else if (sourceType === 'collection') {
    return 'Collection'
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
  if (!navDate) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(navDate)
}

// Don't just use the earliest year, also take label length into account
// When years occur in very long labels like descriptions, these years can refer
// to other things than the map itself.
function scoreYear({ value, year }: { value: string; year: number }) {
  const weightYear = 1
  const weightLabelLength = 10

  const score =
    (year - YEAR_MIN) * weightYear + value.length * weightLabelLength

  return score
}

function findYearsFromLanguageString(languageString?: LanguageString) {
  if (!languageString) {
    return []
  }

  return Object.values(languageString)
    .map((values) => values.map(findYearFromValue))
    .flat(2)
}

function findYearFromValue(value: string | number | boolean) {
  const regex = /\b(?<year>\d{4})\b/g

  const stringValue = String(value)
  const years = []

  for (const match of stringValue.matchAll(regex)) {
    const yearStr = match.groups?.year
    if (yearStr) {
      const year = parseInt(yearStr)
      if (year > YEAR_MIN && year < YEAR_MAX) {
        years.push(year)
      }
    }
  }

  return years.map((year) => ({ value: String(value), year }))
}

export function findYearFromCanvas(canvas?: IIIFCanvas) {
  if (canvas) {
    if (canvas.navDate) {
      return canvas.navDate.getFullYear()
    } else {
      return findYearFromIIIFResource(canvas)
    }
  }
}

export function findYearFromManifest(manifest?: IIIFManifest) {
  if (manifest) {
    if (manifest.navDate) {
      return manifest.navDate.getFullYear()
    } else {
      return findYearFromIIIFResource(manifest)
    }
  }
}

function findYearFromIIIFResource(iiifResource: IIIFPresentationResource) {
  const metadataYears = findYearsFromMetadata(iiifResource.metadata)
  const descriptionYears = findYearsFromLanguageString(
    Object(iiifResource.description)
  )
  const labelYears = findYearsFromLanguageString(Object(iiifResource.label))
  const summaryYears =
    'summary' in iiifResource
      ? findYearsFromLanguageString(Object(iiifResource.summary))
      : []

  const allYears = [
    ...metadataYears,
    ...descriptionYears,
    ...labelYears,
    ...summaryYears
  ]

  const sortedYears = allYears
    .map((year) => ({
      ...year,
      score: scoreYear(year)
    }))
    .sort((a, b) => a.score - b.score)

  const earliestYear = sortedYears[0]

  if (earliestYear) {
    return earliestYear.year
  }
}

export function findYearsFromMetadata(metadata?: Metadata) {
  if (!metadata) {
    return []
  }

  const allYears = []

  for (const metadataItem of metadata) {
    const values = Object.values(metadataItem.value).flat()
    const regex = /\b(?<year>\d{4})\b/g

    for (const value of values) {
      const stringValue = String(value)
      const years = []

      for (const match of stringValue.matchAll(regex)) {
        const yearStr = match.groups?.year
        if (yearStr) {
          const year = parseInt(yearStr)
          if (year > YEAR_MIN && year < YEAR_MAX) {
            years.push(year)
          }
        }
      }

      if (years.length > 0) {
        allYears.push(...years.map((year) => ({ value: String(value), year })))
      }
    }
  }

  return allYears
}
