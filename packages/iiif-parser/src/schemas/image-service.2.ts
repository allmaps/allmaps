import { z } from 'zod'

const profileUris = [
  'http://iiif.io/api/image/2/level0.json',
  'http://iiif.io/api/image/2/level1.json',
  'http://iiif.io/api/image/2/level2.json'
] as const

export const ImageService2Schema = z.object({
  '@id': z.string().url(),
  profile: z.enum(profileUris)
})
