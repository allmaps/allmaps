// Image API 2.1.1
// https://iiif.io/api/image/2.1/#image-information

import { z } from 'zod'
import { TilesetSchema, SizeSchema } from './shared.js'

import { profileUris } from './image-service.2.js'

const Image2ProfileUri = z.enum(profileUris)

export const Image2ProfileDescriptionSchema = z.object({
  formats: z.string().array().optional(),
  maxArea: z.number().int().optional(),
  maxHeight: z.number().int().optional(),
  maxWidth: z.number().int().optional(),
  qualities: z.string().array().optional(),
  supports: z.string().array().optional()
})

const Image2ProfileSchema = z.union([
  Image2ProfileUri,
  Image2ProfileDescriptionSchema
])

export const Image2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('iiif:Image').optional(),
  protocol: z.literal('http://iiif.io/api/image'),
  width: z.number().int(),
  height: z.number().int(),
  profile: Image2ProfileUri.or(z.array(Image2ProfileSchema)),
  // .refine((val) => Array.isArray(val) && (typeof val[0] === 'string') && ['profileUris'].includes(val[0])),
  sizes: SizeSchema.array().optional(),
  tiles: TilesetSchema.array().optional()
})
