import type { PartOf, PartOfItem } from '@allmaps/annotation'

// TODO: update LanguageString from @allmaps/iiif-parser to also include numnbers and booleans
type LanguageString = Record<string, (string | number | boolean)[]>

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
