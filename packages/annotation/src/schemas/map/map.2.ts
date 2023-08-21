import { z } from 'zod'

import {
  PointSchema,
  ImageServiceSchema,
  PartOfSchema,
  ResourceMaskSchema,
  TransformationSchema
} from '../shared.js'

export const GCPSchema = z.object({
  resource: PointSchema,
  geo: PointSchema
})

export const ResourceSchema = z.object({
  id: z.string().url(),
  width: z.number(),
  height: z.number(),
  type: ImageServiceSchema,
  partOf: PartOfSchema.array().optional()
})

export const MapSchema = z.object({
  '@context': z
    .literal('https://schemas.allmaps.org/map/2/context.json')
    .optional(),
  type: z.literal('GeoreferencedMap'),
  id: z.string().optional(),
  resource: ResourceSchema,
  gcps: GCPSchema.array(),
  resourceMask: ResourceMaskSchema,
  transformation: TransformationSchema.optional()
})

export const MapsSchema = z.array(MapSchema)
