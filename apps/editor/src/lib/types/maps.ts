import { z } from 'zod'

import {
  PointSchema,
  ResourceMaskSchema,
  DbTransformationSchema,
  DbResourceCrsSchema,
  DbImageServiceSchema,
  DbGcp1Schema,
  DbGcps1Schema,
  DbResource1Schema,
  DbMap1Schema,
  DbMaps1Schema,
  DbGcp2Schema,
  DbGcps2Schema,
  DbResource2Schema,
  DbMap2Schema,
  DbMaps2Schema,
  DbGcp3Schema,
  CompleteDbGcp3Schema,
  DbGcps3Schema,
  DbResource3Schema,
  DbMap3Schema,
  DbMaps3Schema,
  DbGcpSchema,
  DbMapSchema,
  DbMapsSchema
} from '../schemas/maps.js'

export type Point = z.infer<typeof PointSchema>
export type ResourceMask = z.infer<typeof ResourceMaskSchema>

export type DbImageService = z.infer<typeof DbImageServiceSchema>

export type DbTransformation = z.infer<typeof DbTransformationSchema>

export type DbResourceCrs = z.infer<typeof DbResourceCrsSchema>

// ============================================================================
// Map version 1
// ============================================================================

export type DbGcp1 = z.infer<typeof DbGcp1Schema>

export type DbGcps1 = z.infer<typeof DbGcps1Schema>

export type DbResource1 = z.infer<typeof DbResource1Schema>

export type DbMap1 = z.infer<typeof DbMap1Schema>

export type DbMaps1 = z.infer<typeof DbMaps1Schema>

// ============================================================================
// Map version 2
// ============================================================================

export type DbGcp2 = z.infer<typeof DbGcp2Schema>

export type DbGcps2 = z.infer<typeof DbGcps2Schema>

export type DbResource2 = z.infer<typeof DbResource2Schema>

export type DbMap2 = z.infer<typeof DbMap2Schema>

export type DbMaps2 = z.infer<typeof DbMaps2Schema>

// ============================================================================
// Map version 3
// ============================================================================

export type DbGcp3 = z.infer<typeof DbGcp3Schema>

export type CompleteDbGcp3 = z.infer<typeof CompleteDbGcp3Schema>

export type DbGcps3 = z.infer<typeof DbGcps3Schema>

export type DbResource3 = z.infer<typeof DbResource3Schema>

export type DbMap3 = z.infer<typeof DbMap3Schema>

export type DbMaps3 = z.infer<typeof DbMaps3Schema>

// ============================================================================
// Union types
// ============================================================================

export type DbGcp = z.infer<typeof DbGcpSchema>

export type DbMap = z.infer<typeof DbMapSchema>

export type DbMaps = z.infer<typeof DbMapsSchema>
