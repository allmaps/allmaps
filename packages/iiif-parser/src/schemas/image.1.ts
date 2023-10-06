// Image API 1.1
// https://iiif.io/api/image/1.1/#image-information

import { z } from 'zod'

export const image1ProfileUriRegex =
  /^https?:\/\/library.stanford.edu\/iiif\/image-api\/1.1\/compliance.html#level(?<level>[012])$/

export const Image1ProfileUri = z.string().regex(image1ProfileUriRegex)

export const Image1ProfileSchema = Image1ProfileUri

export const Image1ContextString =
  'http://library.stanford.edu/iiif/image-api/1.1/context.json'

// Used by https://gallica.bnf.fr/iiif/ark:/12148/btv1b53192683w/manifest.json (among others)
export const Image1ContextStringIncorrect =
  'http://iiif.io/api/image/1/context.json'

export const Image1Context = z.literal(Image1ContextString)

export const Image1Schema = z.object({
  '@context': Image1Context,
  '@id': z.string().url(),
  profile: Image1ProfileUri.optional(),
  width: z.number().int(),
  height: z.number().int(),
  scale_factors: z.number().array().optional(),
  tile_width: z.number().optional(),
  tile_height: z.number().optional()
})
