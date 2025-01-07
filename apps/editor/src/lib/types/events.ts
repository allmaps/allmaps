import type { Point } from '$lib/types/shared.js'
import type { DbMap3, DbGcp3 } from '$lib/types/maps.js'

// ============================================================================
// Events
// ============================================================================

export type InsertMap = {
  mapId: string
  map: DbMap3
}

export type RemoveMap = {
  mapId: string
}

export type InsertResourceMaskPoint = {
  mapId: string
  index: number
  point: Point
}

export type ReplaceResourceMaskPoint = {
  mapId: string
  index: number
  point: Point
}

export type RemoveResourceMaskPoint = {
  mapId: string
  index: number
}

export type InsertGcp = {
  mapId: string
  // gcpId: string
  gcp: DbGcp3
}

export type ReplaceGcp = {
  mapId: string
  // gcpId: string
  gcp: DbGcp3
}

export type RemoveGcp = {
  mapId: string
  gcpId: string
}

export type InsertMapEvent = CustomEvent<InsertMap>
export type RemoveMapEvent = CustomEvent<RemoveMap>

export type InsertResourceMaskPointEvent = CustomEvent<InsertResourceMaskPoint>
export type ReplaceResourceMaskPointEvent =
  CustomEvent<ReplaceResourceMaskPoint>
export type RemoveResourceMaskPointEvent = CustomEvent<RemoveResourceMaskPoint>

export type InsertGcpEvent = CustomEvent<InsertGcp>
export type ReplaceGcpEvent = CustomEvent<ReplaceGcp>
export type RemoveGcpEvent = CustomEvent<RemoveGcp>
