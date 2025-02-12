import { zodToJsonSchema } from 'zod-to-json-schema'

import { GeoreferencedMapSchema } from '@allmaps/annotation'

const georeferencedMapJsonSchemaId =
  'https://schemas.allmaps.org.com/map/1/schema.json'
const georeferencedMapJsonSchema = zodToJsonSchema(GeoreferencedMapSchema)

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
