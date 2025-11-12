import type { Point, ClickedItem } from '$lib/types/shared.js'
import type {
  ResourceMask,
  DbMap3,
  DbGcp3,
  DbTransformation,
  DbProjection
} from '$lib/types/maps.js'

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

export type ReplaceResourceMask = {
  mapId: string
  resourceMask: ResourceMask
}

export type ReplaceGcps = {
  mapId: string
  gcps: DbGcp3[]
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
  gcp: DbGcp3
}

export type ReplaceGcp = {
  mapId: string
  gcp: DbGcp3
}

export type RemoveGcp = {
  mapId: string
  gcpId: string
}

export type SetTransformation = {
  mapId: string
  transformation?: DbTransformation
}

export type SetResourceCrs = {
  mapId: string
  resourceCrs?: DbProjection
}

export type InsertMapEvent = CustomEvent<InsertMap>
export type RemoveMapEvent = CustomEvent<RemoveMap>

export type ReplaceResourceMaskEvent = CustomEvent<ReplaceResourceMask>
export type ReplaceGcpsEvent = CustomEvent<ReplaceGcps>

export type InsertResourceMaskPointEvent = CustomEvent<InsertResourceMaskPoint>
export type ReplaceResourceMaskPointEvent =
  CustomEvent<ReplaceResourceMaskPoint>
export type RemoveResourceMaskPointEvent = CustomEvent<RemoveResourceMaskPoint>

export type InsertGcpEvent = CustomEvent<InsertGcp>
export type ReplaceGcpEvent = CustomEvent<ReplaceGcp>
export type RemoveGcpEvent = CustomEvent<RemoveGcp>

export type SetTransformationEvent = CustomEvent<SetTransformation>
export type SetResourceCrsEvent = CustomEvent<SetResourceCrs>

export type ClickedItemEvent = CustomEvent<ClickedItem>
