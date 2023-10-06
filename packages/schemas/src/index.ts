import { zodToJsonSchema } from 'zod-to-json-schema'

import { MapSchema } from '@allmaps/annotation'

const mapJsonSchemaId = 'https://schemas.allmaps.org.com/map/1/schema.json'
const mapJsonSchema = zodToJsonSchema(MapSchema)

console.log(
  JSON.stringify(
    {
      '@id': mapJsonSchemaId,
      ...mapJsonSchema
    },
    null,
    2
  )
)
