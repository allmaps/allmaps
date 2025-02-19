import { z } from 'zod'

export const PointSchema = z.tuple([z.number(), z.number()])
export const ResourceMaskSchema = PointSchema.array().min(3)

export const DbTransformationSchema = z.enum([
  'straight',
  'helmert',
  'polynomial',
  'polynomial1',
  'polynomial2',
  'polynomial3',
  'projective',
  'thinPlateSpline'
])

export const DbImageServiceSchema = z.enum([
  'ImageService1',
  'ImageService2',
  'ImageService3'
])

// ============================================================================
// Map version 1
// ============================================================================

export const DbGcp1Schema = z.object({
  id: z.string(),
  image: PointSchema.optional(),
  world: PointSchema.optional()
})

export const DbGcps1Schema = z.record(z.string(), DbGcp1Schema)

export const DbResource1Schema = z.object({
  id: z.string(),
  uri: z.string(),
  type: DbImageServiceSchema,
  width: z.number(),
  height: z.number()
})

export const DbMap1Schema = z.object({
  id: z.string(),
  gcps: DbGcps1Schema,
  image: DbResource1Schema,
  version: z.literal(1),
  pixelMask: ResourceMaskSchema
})

export const DbMaps1Schema = z.record(z.string(), DbMap1Schema)

// ============================================================================
// Map version 2
// ============================================================================

export const DbGcp2Schema = z.object({
  id: z.string(),
  resource: PointSchema.optional(),
  geo: PointSchema.optional()
})

export const DbGcps2Schema = z.record(z.string(), DbGcp2Schema)

export const DbResource2Schema = z.object({
  id: z.string(),
  uri: z.string(),
  type: DbImageServiceSchema,
  width: z.number(),
  height: z.number()
})

export const DbMap2Schema = z.object({
  id: z.string(),
  gcps: DbGcps2Schema,
  resource: DbResource2Schema,
  version: z.literal(2),
  resourceMask: ResourceMaskSchema
})

export const DbMaps2Schema = z.record(z.string(), DbMap2Schema)

// ============================================================================
// Map version 3
// ============================================================================

export const DbGcp3Schema = z.object({
  id: z.string(),
  index: z.number().optional(),
  resource: PointSchema.optional(),
  geo: PointSchema.optional()
})

export const CompleteDbGcp3Schema = z.object({
  id: z.string(),
  index: z.number(),
  resource: PointSchema,
  geo: PointSchema
})

export const DbGcps3Schema = z.record(z.string(), DbGcp3Schema)

export const DbResource3Schema = DbResource2Schema

export const DbMap3Schema = z.object({
  id: z.string(),
  transformation: DbTransformationSchema.optional(),
  gcps: DbGcps3Schema,
  resource: DbResource3Schema,
  version: z.literal(3),
  resourceMask: ResourceMaskSchema
})

export const DbMaps3Schema = z.record(z.string(), DbMap3Schema)

// ============================================================================
// Union types
// ============================================================================

export const DbGcpSchema = z.union([DbGcp1Schema, DbGcp2Schema, DbGcp3Schema])

export const DbMapSchema = z.union([DbMap1Schema, DbMap2Schema, DbMap3Schema])

export const DbMapsSchema = z.record(z.string(), DbMapSchema)
