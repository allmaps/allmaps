import { z } from 'zod'

import {
  PointSchema,
  ResourceMaskSchema,
  DbTransformationSchema,
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

// import type { TransformationType } from '@allmaps/transform'

// import type { Point } from '$lib/types/shared.js'

// export type ResourceMask = Point[]

// export type DbImageService = 'ImageService1' | 'ImageService2' | 'ImageService3'

// // ============================================================================
// // Map version 1
// // ============================================================================

// export type DbGcp1 = {
//   id: string
//   image?: Point
//   world?: Point
// }

// export type DbGcps1 = Record<string, DbGcp1>

// export type DbResource1 = {
//   id: string
//   uri: string
//   type: DbImageService
//   width: number
//   height: number
// }

// export type DbMap1 = {
//   id: string
//   gcps: DbGcps1
//   image: DbResource1
//   version: 1
//   pixelMask: ResourceMask
// }

// export type DbMaps1 = Record<string, DbMap1>

// // ============================================================================
// // Map version 2
// // ============================================================================

// export type DbGcp2 = {
//   id: string
//   resource?: Point
//   geo?: Point
// }

// export type DbGcps2 = Record<string, DbGcp2>

// export type DbResource2 = {
//   id: string
//   uri: string
//   type: DbImageService
//   width: number
//   height: number
// }

// export type DbMap2 = {
//   id: string
//   gcps: DbGcps2
//   resource: DbResource2
//   version: 2
//   resourceMask: ResourceMask
// }

// export type DbMaps2 = Record<string, DbMap2>

// // ============================================================================
// // Map version 3
// // ============================================================================

// export type DbGcp3 = {
//   id: string
//   index: number
//   resource?: [number, number]
//   geo?: [number, number]
// }

// export type CompleteDbGcp3 = {
//   id: string
//   index: number
//   resource: [number, number]
//   geo: [number, number]
// }

// export type DbGcps3 = Record<string, DbGcp3>

// export type DbResource3 = DbResource2

// export type DbTransformation3 = {
//   // TODO: import TransformationType from @allmaps/transform or @allmaps/annotation
//   type: 'polynomial' | 'thinPlateSpline'
//   options?: {}
// }

// export type DbMap3 = {
//   id: string
//   transformation?: TransformationType
//   gcps: DbGcps3
//   resource: DbResource3
//   version: 3
//   resourceMask: ResourceMask
// }

// export type DbMaps3 = Record<string, DbMap3>

// // ============================================================================
// // Union types
// // ============================================================================

// export type DbGcp = DbGcp1 | DbGcp2 | DbGcp3

// export type DbGcps = DbGcps1 | DbGcps2 | DbGcps3

// export type DbMap = DbMap1 | DbMap2 | DbMap3

// export type DbMaps = Record<string, DbMap1 | DbMap2 | DbMap3>
