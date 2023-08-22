import { z } from 'zod'

import {
  PointSchema,
  ImageServiceSchema,
  ResourceMaskSchema,
  TransformationSchema
} from '../shared.js'

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

export const MapSchema = z.object({
  id: z.string().optional(),
  version: z.number().min(1).max(1).default(1),
  image: ImageSchema,
  gcps: GCPSchema.array(),
  pixelMask: ResourceMaskSchema,
  transformation: TransformationSchema.optional()
})

export const MapsSchema = z.array(MapSchema)
