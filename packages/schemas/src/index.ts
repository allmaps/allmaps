import { z } from 'zod'

import { GeoreferencedMapSchema } from '@allmaps/annotation'

const georeferencedMapJsonSchemaId =
  'https://schemas.allmaps.org.com/map/1/schema.json'
const georeferencedMapJsonSchema = z.toJSONSchema(GeoreferencedMapSchema)

console.log(
  JSON.stringify(
    {
      '@id': georeferencedMapJsonSchemaId,
      ...georeferencedMapJsonSchema
    },
    null,
    2
  )
)
