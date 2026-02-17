import type { PartOfItem } from '@allmaps/annotation'
import type { LanguageString } from '@allmaps/iiif-parser'

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

export function labelFromPartOfItem(item: PartOfItem) {
  if (item.label) {
    return parseLanguageString(item.label)
  }
}
