import { z } from 'zod'

import { Image2ProfileSchema } from './image.2.js'

export const complianceLevels = ['level0', 'level1', 'level2'] as const

export const imageServiceTypes = [
  'ImageService1',
  'ImageService2',
  'ImageService3'
] as const

export const Presentation3ImageService2Schema = z
  .object({
    id: z.string().url(),
    type: z.literal('ImageService2'),
    profile: Image2ProfileSchema
  })
  .or(
    z.object({
      '@id': z.string().url(),
      '@type': z.literal('ImageService2'),
      profile: Image2ProfileSchema
    })
  )

export const Presentation3ImageService3Schema = z.object({
  id: z.string().url(),
  type: z.enum(imageServiceTypes),
  profile: z.enum(complianceLevels)
})

export const ImageService3Schema = z.union([
  Presentation3ImageService2Schema,
  Presentation3ImageService3Schema
])
