import { z } from 'zod'

import {
  SerializedGeoreferencedMap1Schema,
  SerializedGeoreferencedMap2Schema
} from '@allmaps/annotation/serialized'

export { map2Context } from './map-v2.js'

function mapSchema(version: number, schema: z.ZodType) {
  return {
    $id: `https://schemas.allmaps.org/map/${version}/schema.json`,
    title: `Allmaps Georeferenced Map v${version}`,
    // Maps can carry extension properties, including API and Editor metadata.
    ...z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' })
  }
}

export const map1Schema = mapSchema(1, SerializedGeoreferencedMap1Schema)
export const map2Schema = mapSchema(2, SerializedGeoreferencedMap2Schema)
