import { z } from 'zod'

export const profileUris = [
  'http://iiif.io/api/image/2/level0.json',
  'http://iiif.io/api/image/2/level1.json',
  'http://iiif.io/api/image/2/level2.json',

  // Many IIIF servers use incorrect profile URIs (without .json)
  // This happens so often - @allmaps/iiif-parser should parse them regardless
  'http://iiif.io/api/image/2/level0',
  'http://iiif.io/api/image/2/level1',
  'http://iiif.io/api/image/2/level2'
] as const

export const ImageService2Schema = z.object({
  '@id': z.string().url(),
  profile: z.enum(profileUris)
})
