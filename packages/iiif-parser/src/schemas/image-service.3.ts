import { z } from 'zod'

export const complianceLevels = ['level0', 'level1', 'level2'] as const

export const imageServiceTypes = ['ImageService2', 'ImageService3'] as const

complianceLevels

export const ImageService3Schema = z.object({
  id: z.string().url(),
  type: z.enum(imageServiceTypes),
  profile: z.enum(complianceLevels)
})
