// Image API 1.1
// https://iiif.io/api/image/1.1/#image-information

import { z } from 'zod'
import { TilesetSchema, SizeSchema } from './shared.js'
// export const Image1ProfileSchema = z.union([
//   z.literal('http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level0'),
//   z.literal('http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level1'),
//   z.literal('http://library.stanford.edu/iiif/image-api/1.1/compliance.html#level2')
// ])
export const image1ProfileUriRegex =
  /^https?:\/\/library.stanford.edu\/iiif\/image-api\/1.1\/compliance.html#level(?<level>[012])$/

export const Image1ProfileUri = z.string().regex(image1ProfileUriRegex)

export const Image1ProfileSchema = Image1ProfileUri

export const Image1Context = z.literal('http://library.stanford.edu/iiif/image-api/1.1/context.json')

export const Image1Schema = z.object({
  '@context': Image1Context,
  '@id': z.string().url(),
  width: z.number().int(),
  height: z.number().int(),
  scale_factors: z.number().array().optional(),
  tile_width: z.number().optional(),
  tile_height: z.number().optional(),
  formats: z.array(z.union([
    z.literal('jpg'),
    z.literal('png'),
    z.literal('tif'),
    z.literal('gif'),
    z.literal('pdf'),
    z.literal('jp2')
  ])).optional(),
  qualities: z.array(z.union([
    z.literal('native'),
    z.literal('color'),
    z.literal('grey'),
    z.literal('bitonal')
  ])).optional(),
  profile: Image1ProfileUri,
  sizes: SizeSchema.array().optional(),
  tiles: TilesetSchema.array().optional()
})
