// Image API 3.0.0
// https://iiif.io/api/image/3.0/#51-image-information-request

import { z } from 'zod'
import { TilesetSchema, SizeSchema, optionalValue } from './shared.js'

export const image3Profiles = ['level0', 'level1', 'level2'] as const

export const Image3ProfileSchema = z.enum(image3Profiles)

export const Image3Schema = z.object({
  id: z.string().url(),
  type: z.literal('ImageService3'),
  protocol: z.literal('http://iiif.io/api/image'),
  profile: Image3ProfileSchema,
  width: z.number().int(),
  height: z.number().int(),
  maxWidth: optionalValue(z.number().int()),
  maxHeight: optionalValue(z.number().int()),
  maxArea: optionalValue(z.number().int()),
  sizes: optionalValue(SizeSchema.array()),
  tiles: optionalValue(TilesetSchema.array()),
  extraFeatures: optionalValue(z.string().array()),
  extraFormats: optionalValue(z.string().array()),
  preferredFormats: optionalValue(z.string().array())

  // rights
  // TODO: add partOf, seeAlso, and service
})
