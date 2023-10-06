import { z } from 'zod'

import {
  PossibleLanguageValue2Schema,
  Metadata2Schema
} from '../schemas/presentation.2.js'
import {
  LanguageValue3Schema,
  Metadata3Schema
} from '../schemas/presentation.3.js'

import type { LanguageString, Metadata } from '../lib/types.js'

type PossibleLanguageValue2Type = z.infer<typeof PossibleLanguageValue2Schema>
type Metadata2Type = z.infer<typeof Metadata2Schema>

type Metadata3Type = z.infer<typeof Metadata3Schema>

export const LanguageString3Schema = z.record(z.string(), z.string().array())

export const MetadataStringItem3Schema = z.object({
  label: LanguageString3Schema.optional(),
  value: LanguageString3Schema.optional()
})

// export const MetadataString3Schema = MetadataStringItem3Schema.array()

type LanguageValue3Type = z.infer<typeof LanguageValue3Schema>
// type MetadataString3Type = z.infer<typeof MetadataString3Schema>

export function parseVersion2String(
  str?: PossibleLanguageValue2Type
): LanguageString {
  // TODO: use type guards!
  if (
    typeof str === 'string' ||
    typeof str === 'number' ||
    typeof str === 'boolean'
  ) {
    return {
      none: [String(str)]
    }
  } else if (Array.isArray(str)) {
    let strings: LanguageString = {}

    str.forEach((item) => {
      if (
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      ) {
        if (!strings['none']) {
          strings['none'] = []
        }
        strings['none'].push(String(item))
      } else if (typeof item === 'object') {
        // TODO: find test input data for this scenario
        strings = { ...strings, ...parseVersion2String(item) }
      } else {
        throw new Error('Unable to parse string')
      }
    })

    return strings
  } else if (str && typeof str === 'object') {
    const language = str['@language'] || 'none'
    const value = String(str['@value'])

    return {
      [language]: Array.isArray(value) ? value : [value]
    }
  } else {
    throw new Error('Unable to parse string')
  }
}

export function parseVersion3String(
  str?: LanguageValue3Type
): LanguageString | undefined {
  if (!str) {
    return
  }

  const parsedStr: LanguageString = {}

  for (const language in str) {
    parsedStr[language] = str[language].map((item) => String(item))
  }

  return parsedStr
}

export function parseVersion2Metadata(
  metadata: Metadata2Type | undefined
): Metadata | undefined {
  if (metadata?.length) {
    return (
      metadata
        // Only process metadata entries that have both label & value
        .filter(({ label, value }) => label && value)
        .map(({ label, value }) => ({
          label: parseVersion2String(label),
          value: parseVersion2String(value)
        }))
    )
  } else if (!metadata) {
    return undefined
  } else {
    throw new Error('Unable to parse metadata')
  }
}

export function filterInvalidMetadata(
  metadata: Metadata3Type | undefined
): Metadata | undefined {
  if (!metadata) {
    return undefined
  }

  // TODO: I don't know why TypeScript complains about
  // a simple filter function. For now, do this:
  const filteredMetadata: Metadata = []
  for (const item of metadata) {
    const label = parseVersion3String(item.label)
    const value = parseVersion3String(item.value)

    if (label && value) {
      filteredMetadata.push({
        label,
        value
      })
    }
  }

  return filteredMetadata
}
