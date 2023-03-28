import { z } from 'zod'

import {
  StringValue2Schema,
  Metadata2Schema
} from '../schemas/presentation.2.js'
import {
  StringValue3Schema,
  Metadata3Schema
} from '../schemas/presentation.3.js'

type StringValue2Type = z.infer<typeof StringValue2Schema>
type Metadata2Type = z.infer<typeof Metadata2Schema>

type StringValue3Type = z.infer<typeof StringValue3Schema>
type Metadata3Type = z.infer<typeof Metadata3Schema>

export function parseVersion2String(str?: StringValue2Type): StringValue3Type {
  if (typeof str === 'string') {
    return {
      none: [str]
    }
  } else if (Array.isArray(str)) {
    let strings: StringValue3Type = {}

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
    const language = str['@language'] || 'none'
    const value = str['@value']

    return {
      [language]: Array.isArray(value) ? value : [value]
    }
  } else {
    throw new Error('Unable to parse string')
  }
}

export function parseVersion2Metadata(
  metadata: Metadata2Type | undefined
): Metadata3Type | undefined {
  if (metadata?.length) {
    return metadata
      // Only process metadata entries that have both label & value
      .filter(({ label, value }) => label && value)
      .map(({ label, value }) => ({
        label: parseVersion2String(label),
        value: parseVersion2String(value)
      }))
  } else if (!metadata) {
    return undefined
  } else {
    throw new Error('Unable to parse metadata')
  }
}
