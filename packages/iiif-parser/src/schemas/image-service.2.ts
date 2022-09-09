import { z } from 'zod'

import { Image2ProfileSchema} from './image.2.js'

export const ImageService2Schema = z.object({
  '@id': z.string().url(),
  profile: Image2ProfileSchema
})
