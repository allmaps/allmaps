import { z } from 'zod'
import { Image1ProfileSchema, Image1Context } from './image.1.js'
import { Image2ProfileSchema, Image2Context } from './image.2.js'
import { Image3ProfileSchema } from './image.3.js'

import { ImageServiceTypesSchema } from './shared.js'

// TODO: also support Presentation API 2 with Image API 3
// TODO: also support Image3Context (a string or an array of strings)
export const ImageService2Schema = z.object({
  '@id': z.string().url(),
  '@type': ImageServiceTypesSchema.optional(),
  profile: Image1ProfileSchema.or(Image2ProfileSchema).or(Image3ProfileSchema),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  '@context': Image1Context.or(
    z.literal('http://iiif.io/api/image/1/context.json')
  )
    .or(Image2Context)
    .optional()
})
