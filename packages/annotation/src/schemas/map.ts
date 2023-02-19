import { z } from 'zod'

import { PointSchema, ImageServiceSchema } from './shared.js'

export const GCPSchema = z.object({
  image: PointSchema,
  world: PointSchema
})

export const TransformationSchema = z.object({
  type: z.string(),
  order: z.number().optional()
})

export const ImageSchema = z.object({
  uri: z.string().url(),
  width: z.number(),
  height: z.number(),
  type: ImageServiceSchema
})

export const PixelMaskSchema = PointSchema.array().min(3)

export const MapSchema = z.object({
  // TODO: add JSON-LD context and type, remove version
  // '@context': z.literal('http://schemas.allmaps.org/map/1/context.json').optional(),
  // type: z.literal('Georef'),

  id: z.string().optional(),
  version: z.number().min(1).max(1).default(1),
  gcps: GCPSchema.array(),
  pixelMask: PixelMaskSchema,
  image: ImageSchema,
  transformation: TransformationSchema.optional()
})

export const MapsSchema = z.array(MapSchema)
