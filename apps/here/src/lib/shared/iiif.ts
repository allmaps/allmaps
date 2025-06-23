import type { PartOf, PartOfItem } from '@allmaps/annotation'

// TODO: update LanguageString from @allmaps/iiif-parser to also include numnbers and booleans
type LanguageString = Record<string, (string | number | boolean)[]>
type Metadata = MetadataItem[]
type MetadataItem = {
  label: LanguageString
  value: LanguageString
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

function findPartOfItems(partOf: PartOf, type: string): PartOfItem[] {
  const items: PartOfItem[] = []

  if (partOf) {
    partOf.forEach((item) => {
      if (item.type === type) {
        items.push(item)
      }

      if (item.partOf) {
        items.push(...findPartOfItems(item.partOf, type))
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

export function findYearFromMetadata(metadata?: Metadata) {
  if (metadata) {
    let allPossibleYears = []

    for (const metadataItem of metadata) {
      const values = Object.values(metadataItem.value).flat()
      const regex = /\b(?<year>\d{4})\b/g

      for (const value of values) {
        const stringValue = String(value)
        let possibleYears = []

        for (const match of stringValue.matchAll(regex)) {
          const yearStr = match.groups?.year
          if (yearStr) {
            const year = parseInt(yearStr)
            if (year > YEAR_MIN && year < YEAR_MAX) {
              possibleYears.push(year)
            }
          }
        }

        if (possibleYears.length > 0) {
          allPossibleYears.push({
            value,
            years: possibleYears.toSorted((a, b) => a - b)
          })
        }
      }
    }

    const possibleYearsWithShortestLabel = allPossibleYears.sort(
      (a, b) => String(a.value).length - String(b.value).length
    )[0]

    if (possibleYearsWithShortestLabel) {
      return possibleYearsWithShortestLabel.years[0]
    }
  }
}
