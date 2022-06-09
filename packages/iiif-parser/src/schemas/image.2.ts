// Image API 2.1.1
// https://iiif.io/api/image/2.1/#image-information

import { z } from 'zod'
import { TilesetSchema, SizeSchema } from './shared.js'

const profileUris = [
  'http://iiif.io/api/image/2/level0.json',
  'http://iiif.io/api/image/2/level1.json',
  'http://iiif.io/api/image/2/level2.json'
] as const

const Image2ProfileUri = z.enum(profileUris)

export const Image2ProfileDescriptionSchema = z.object({
  formats: z.string().array().optional(),
  maxArea: z.number().int().optional(),
  maxHeight: z.number().int().optional(),
  maxWidth: z.number().int().optional(),
  qualities: z.string().array().optional(),
  supports: z.string().array().optional()
})
const profile = z.union([Image2ProfileUri, Image2ProfileDescriptionSchema])

export const Image2Schema = z.object({
  '@context': z.literal('http://iiif.io/api/image/2/context.json'),
  '@id': z.string().url(),
  '@type': z.literal('iiif:Image').optional(),
  protocol: z.literal('http://iiif.io/api/image'),
  width: z.number().int(),
  height: z.number().int(),
  profile: z
    .array(profile),
    // .refine((val) => Array.isArray(val) && (typeof val[0] === 'string') && ['profileUris'].includes(val[0])),
  sizes: SizeSchema.array().optional(),
  tiles: TilesetSchema.array().optional()
})
