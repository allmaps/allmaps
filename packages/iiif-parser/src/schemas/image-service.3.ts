import { z } from 'zod'

export const complianceLevels = [
  'level0', 'level1',  'level2'
] as const

complianceLevels

export const ImageService3Schema = z.object({
  id: z.string().url(),
  width: z.number().int(),
  height: z.number().int(),
  profile: z.enum(complianceLevels)
})
