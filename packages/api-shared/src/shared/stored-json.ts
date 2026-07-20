import { z } from 'zod'

import type { LanguageString } from '@allmaps/iiif-parser'

const LanguageStringSchema = z.record(
  z.string(),
  z.array(z.union([z.string(), z.number(), z.boolean()]))
)

export function parseStoredJson(value: unknown) {
  // TODO: Remove legacy string decoding after existing JSONB data is
  // normalized and database constraints prevent encoded JSON strings.
  return typeof value === 'string' ? JSON.parse(value) : value
}

export function parseStoredLanguageString(value: unknown): LanguageString {
  // TODO: Remove this runtime validation after existing labels are normalized
  // and database constraints guarantee valid language-string objects.
  return LanguageStringSchema.parse(parseStoredJson(value))
}

export function parseStoredNullableLanguageString(
  value: unknown
): LanguageString | null {
  return value === null || value === undefined
    ? null
    : parseStoredLanguageString(value)
}
