import { z } from 'zod'

import {
  PossibleLanguageValue2Schema,
  Metadata2Schema,
  MetadataItem2Schema,
  Thumbnail2Schema,
  Rendering2Schema,
  Related2Schema,
  Attribution2Schema
} from '../schemas/presentation.2.js'
import {
  LanguageValue3Schema,
  Metadata3Schema,
  MetadataItem3Schema
} from '../schemas/presentation.3.js'

import type {
  LanguageString,
  Metadata,
  MetadataItem,
  RequiredStatement,
  Thumbnail,
  Rendering,
  Homepage
} from './types.js'

type Metadata2 = z.infer<typeof Metadata2Schema>
type MetadataItem2 = z.infer<typeof MetadataItem2Schema>

type Metadata3 = z.infer<typeof Metadata3Schema>
type MetadataItem3 = z.infer<typeof MetadataItem3Schema>

export const LanguageString3Schema = z.record(z.string(), z.string().array())

export const MetadataStringItem3Schema = z.object({
  label: LanguageString3Schema.optional(),
  value: LanguageString3Schema.optional()
})

type LanguageValue3 = z.infer<typeof LanguageValue3Schema>

type PossibleLanguageValue2 = z.infer<typeof PossibleLanguageValue2Schema>

type Thumbnail2 = z.infer<typeof Thumbnail2Schema>
type Rendering2 = z.infer<typeof Rendering2Schema>
type Related2 = z.infer<typeof Related2Schema>
type Attribution2 = z.infer<typeof Attribution2Schema>

export function ensureArray<T>(val: T | T[]): T[] | undefined {
  if (val) {
    return Array.isArray(val) ? val : [val]
  }
}

export function parseVersion2String(
  str?: PossibleLanguageValue2
): LanguageString | undefined {
  // TODO: use type guards!
  if (typeof str === 'string') {
    return {
      none: [str]
    }
  } else if (Array.isArray(str)) {
    let strings: LanguageString = {}

    str.forEach((item) => {
      if (typeof item === 'string') {
        if (!strings['none']) {
          strings['none'] = []
        }
        strings['none'].push(item)
      } else if (typeof item === 'object') {
        // TODO: find test input data for this scenario
        strings = { ...strings, ...parseVersion2String(item) }
      } else {
        throw new Error('Unable to parse string')
      }
    })

    return strings
  } else if (str && typeof str === 'object') {
    str
    const language = str['@language'] || 'none'
    const valueOrValues = str['@value'] || ''

    return {
      [language]: Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues]
    }
  }
}

export function parseVersion3String(
  str?: LanguageValue3
): LanguageString | undefined {
  if (!str) {
    return
  }

  const parsedStr: LanguageString = {}

  for (const language in str) {
    parsedStr[language] = str[language]
  }

  return parsedStr
}

export function parseMetadata2Item(
  item?: MetadataItem2
): MetadataItem | undefined {
  if (item) {
    const label = parseVersion2String(item.label)
    const value = parseVersion2String(item.value)

    if (label && value) {
      return { label, value }
    }
  }
}

export function parseMetadata3Item(
  item?: MetadataItem3
): MetadataItem | undefined {
  if (item) {
    const label = parseVersion3String(item.label)
    const value = parseVersion3String(item.value)

    if (label && value) {
      return { label, value }
    }
  }
}

export function isValidMetadataItem(item?: MetadataItem): item is MetadataItem {
  return item !== undefined
}

export function parseVersion2Metadata(
  metadata?: Metadata2
): Metadata | undefined {
  if (Array.isArray(metadata)) {
    if (metadata.length === 0) {
      return undefined
    }

    return metadata.map(parseMetadata2Item).filter(isValidMetadataItem)
  } else if (!metadata) {
    return undefined
  } else {
    throw new Error('Unable to parse metadata')
  }
}

export function parseVersion3Metadata(
  metadata?: Metadata3
): Metadata | undefined {
  if (Array.isArray(metadata)) {
    if (metadata.length === 0) {
      return undefined
    }

    return metadata.map(parseMetadata3Item).filter(isValidMetadataItem)
  } else if (!metadata) {
    return undefined
  } else {
    throw new Error('Unable to parse metadata')
  }
}

export function parseVersion2Attribution(
  attribution?: Attribution2
): RequiredStatement | undefined {
  if (attribution) {
    if (typeof attribution === 'string') {
      return {
        label: {
          none: ['Attribution']
        },
        value: {
          none: [attribution]
        }
      }
    } else {
      const value = parseVersion2String(attribution)

      if (value) {
        return {
          label: {
            none: ['Attribution']
          },
          value
        }
      }
    }
  }
}

export function parseVersion2Thumbnail(
  thumbnail2?: Thumbnail2
): Thumbnail | undefined {
  return thumbnail2?.map((thumbnail) => {
    if (typeof thumbnail === 'string') {
      return {
        id: thumbnail
      }
    } else {
      return {
        id: thumbnail['@id'],
        type: thumbnail['@type'],
        format: thumbnail.format,
        width: thumbnail.width,
        height: thumbnail.height
      }
    }
  })
}

export function parseVersion2Rendering(
  rendering2?: Rendering2
): Rendering | undefined {
  return rendering2?.map((rendering) => ({
    id: rendering['@id'],
    type: rendering['@type'],
    label: parseVersion2String(rendering.label),
    format: rendering.format
  }))
}

export function parseVersion2Related(related?: Related2): Homepage | undefined {
  if (related) {
    if (typeof related === 'string') {
      return [
        {
          id: related
        }
      ]
    } else if (Array.isArray(related)) {
      return related.map((item) => {
        if (typeof item === 'string') {
          return {
            id: item
          }
        } else {
          return {
            id: item['@id'],
            label: parseVersion2String(item.label),
            format: item.format
          }
        }
      })
    } else {
      return [
        {
          id: related['@id'],

          label: parseVersion2String(related.label),
          format: related.format
        }
      ]
    }
  }
}
