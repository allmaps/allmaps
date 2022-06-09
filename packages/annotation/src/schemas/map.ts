import { z } from 'zod'

import { PointSchema, ImageServiceSchema } from './shared.js'

export const GCPSchema = z.object({
  image: PointSchema,
  world: PointSchema
})

export const ImageSchema = z.object({
  uri: z.string().url(),
  width: z.number(),
  height: z.number(),
  type: ImageServiceSchema
})

export const PixelMaskSchema = PointSchema.array().min(3)

export const MapSchema = z.object({
  // TODO: uri instead of id?
  id: z.string().url().optional(),
  version: z.literal(1),
  gcps: GCPSchema.array(),
  pixelMask: PixelMaskSchema,
  image: ImageSchema
})

export const MapsSchema = z.array(MapSchema)
