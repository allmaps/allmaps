import { z } from 'zod'

import type { LanguageString } from '@allmaps/iiif-parser'

const LanguageStringSchema = z.record(
  z.string(),
  z.array(z.union([z.string(), z.number(), z.boolean()]))
)

export function parseStoredNullableLanguageString(
  value: unknown
): LanguageString | null {
  return value === null || value === undefined
    ? null
    : LanguageStringSchema.parse(value)
}
