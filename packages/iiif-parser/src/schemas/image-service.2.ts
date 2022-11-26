import { z } from 'zod'

import { Image2ProfileSchema } from './image.2.js'

// TODO: also support Presentation API 2 with Image API 3

export const ImageService2Schema = z.object({
  '@id': z.string().url(),
  profile: Image2ProfileSchema
})
