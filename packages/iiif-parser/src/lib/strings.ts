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

export function parseVersion2String(str: StringValue2Type): StringValue3Type {
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
        console.log("strings before = ", strings)
        const itemStrings = parseVersion2String(item)
        console.log("  itemStrings = ", itemStrings)
        for (const key in itemStrings) {
          if (key in strings) {
            strings[key] = strings[key].concat(itemStrings[key])
          } else {
            strings[key] = itemStrings[key]
          }
        }
        // strings = { ...strings, ...parseVersion2String(item) }
        console.log("strings after = ", strings)
      } else {
        throw new Error('Unable to parse string')
      }
    })
    console.log("strings = ", strings)

    return strings
  } else if (str && typeof str === 'object') {
    const language = str['@language']
    const value = str['@value']

    if (language === undefined) {
      console.log("Value = ", value)
      return {
        none: Array.isArray(value) ? value : [value]
      }
    } else {
      return {
        [language]: Array.isArray(value) ? value : [value]
      }
    }
  } else {
    throw new Error('Unable to parse string')
  }
}

export function parseVersion2Metadata(
  metadata: Metadata2Type | undefined
): Metadata3Type | undefined {
  if (metadata?.length) {
    return metadata.map(({ label, value }) => ({
      label: parseVersion2String(label),
      value: parseVersion2String(value)
    }))
  } else if (!metadata) {
    return undefined
  } else {
    throw new Error('Unable to parse metadata')
  }
}
