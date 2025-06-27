import {
  Manifest as IIIFManifest,
  Canvas as IIIFCanvas
} from '@allmaps/iiif-parser'
import type { PartOf, PartOfItem } from '@allmaps/annotation'

// TODO: update LanguageString from @allmaps/iiif-parser to also include numnbers and booleans
type LanguageString = Record<string, (string | number | boolean)[]>
type Metadata = MetadataItem[]
type MetadataItem = {
  label: LanguageString
  value: LanguageString
}

type PartOfItemWithParent = PartOfItem & {
  parent?: PartOfItem
}

type IIIFResource = {
  metadata?: Metadata
  description?: LanguageString
  label?: LanguageString
  summary?: LanguageString
}

const YEAR_MIN = 1500
const YEAR_MAX = 2200

export function parseLanguageString(
  languageString?: LanguageString,
  preferredLanguage?: string
) {
  if (!languageString) {
    return ''
  }

  let strings: (string | number | boolean)[] = []

  if (preferredLanguage && languageString[preferredLanguage]) {
    strings = languageString[preferredLanguage]
  } else if (languageString['none']) {
    strings = languageString['none']
  } else if (typeof languageString === 'object' && languageString !== null) {
    if (Object.values(languageString)[0]) {
      strings = Object.values(languageString)[0]
    }
  }

  return strings.map((string) => String(string)).join(' ')
}

function findPartOfItems(
  partOf: PartOf,
  type: string,
  parent?: PartOfItem
): PartOfItemWithParent[] {
  const items: PartOfItemWithParent[] = []

  if (partOf) {
    partOf.forEach((item) => {
      if (item.type === type) {
        items.push({ ...item, parent })
      }

      if (item.partOf) {
        items.push(...findPartOfItems(item.partOf, type, item))
      }
    })
  }

  return items
}

export function findCanvases(partOf: PartOf) {
  return findPartOfItems(partOf, 'Canvas')
}

export function findManifests(partOf: PartOf) {
  return findPartOfItems(partOf, 'Manifest')
}

export function labelFromPartOfItem(item: PartOfItem) {
  if (item.label) {
    return parseLanguageString(item.label)
  }
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
  let years = []

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

function findYearFromIIIFResource(iiifResource: IIIFResource) {
  const metadataYears = findYearsFromMetadata(iiifResource.metadata)
  const descriptionYears = findYearsFromLanguageString(
    Object(iiifResource.description)
  )
  const labelYears = findYearsFromLanguageString(Object(iiifResource.label))
  const summaryYears = findYearsFromLanguageString(Object(iiifResource.summary))

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

  let allYears = []

  for (const metadataItem of metadata) {
    const values = Object.values(metadataItem.value).flat()
    const regex = /\b(?<year>\d{4})\b/g

    for (const value of values) {
      const stringValue = String(value)
      let years = []

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
