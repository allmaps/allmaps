import { z } from 'zod'

import {
  GeoreferencedMap1Schema,
  GeoreferencedMap2Schema,
  GeoreferencedMap2ResourceSchema
} from './georeferenced-map.js'
import {
  PartOfItemSchema,
  SerializedProviderItemSchema,
  ValidTransformationSchema
} from './shared.js'

// These describe serialized documents. The runtime parser also repairs
// legacy transformations, drops invalid dimensions and normalizes arrays.
export const SerializedGeoreferencedMap1Schema = GeoreferencedMap1Schema.extend(
  {
    transformation: ValidTransformationSchema.optional()
  }
)

export const SerializedGeoreferencedMap2Schema = GeoreferencedMap2Schema.extend(
  {
    resource: GeoreferencedMap2ResourceSchema.extend({
      width: GeoreferencedMap2ResourceSchema.shape.width.unwrap(),
      height: GeoreferencedMap2ResourceSchema.shape.height.unwrap(),
      partOf: z.array(PartOfItemSchema).optional(),
      provider: z.array(SerializedProviderItemSchema).optional()
    }),
    transformation: ValidTransformationSchema.optional()
  }
)
