import type { TransformationType } from '@allmaps/transform'

import type { Point } from '$lib/types/shared.js'

export type ResourceMask = Point[]

export type DbImageService = 'ImageService1' | 'ImageService2' | 'ImageService3'

// ============================================================================
// Map version 1
// ============================================================================

export type DbGcp1 = {
  id: string
  image?: Point
  world?: Point
}

export type DbGcps1 = Record<string, DbGcp1>

export type DbResource1 = {
  id: string
  uri: string
  type: DbImageService
  width: number
  height: number
}

export type DbMap1 = {
  id: string
  gcps: DbGcps1
  image: DbResource1
  version: 1
  pixelMask: ResourceMask
}

export type DbMaps1 = Record<string, DbMap1>

// ============================================================================
// Map version 2
// ============================================================================

export type DbGcp2 = {
  id: string
  resource?: Point
  geo?: Point
}

export type DbGcps2 = Record<string, DbGcp2>

export type DbResource2 = {
  id: string
  uri: string
  type: DbImageService
  width: number
  height: number
}

export type DbMap2 = {
  id: string
  gcps: DbGcps2
  resource: DbResource2
  version: 2
  resourceMask: ResourceMask
}

export type DbMaps2 = Record<string, DbMap2>

// ============================================================================
// Map version 3
// ============================================================================

export type DbGcp3 = {
  id: string
  index: number
  resource?: [number, number]
  geo?: [number, number]
}

export type CompleteDbGcp3 = {
  id: string
  index: number
  resource: [number, number]
  geo: [number, number]
}

export type DbGcps3 = Record<string, DbGcp3>

export type DbResource3 = DbResource2

export type DbMap3 = {
  id: string
  transformation?: TransformationType
  gcps: DbGcps3
  resource: DbResource3
  version: 3
  resourceMask: ResourceMask
}

export type DbMaps3 = Record<string, DbMap3>

// ============================================================================
// Union types
// ============================================================================

export type DbGcp = DbGcp1 | DbGcp2 | DbGcp3

export type DbGcps = DbGcps1 | DbGcps2 | DbGcps3

export type DbMap = DbMap1 | DbMap2 | DbMap3

export type DbMaps = Record<string, DbMap1 | DbMap2 | DbMap3>
