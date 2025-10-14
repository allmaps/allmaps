import type {
  InsertMap,
  RemoveMap,
  ReplaceResourceMask,
  ReplaceGcps,
  InsertResourceMaskPoint,
  ReplaceResourceMaskPoint,
  RemoveResourceMaskPoint,
  InsertGcp,
  ReplaceGcp,
  RemoveGcp,
  SetTransformation,
  SetResourceCrs
} from '$lib/types/events.js'

export const MapsEvents = {
  INSERT_MAP: 'INSERT_MAP' as const,
  REMOVE_MAP: 'REMOVE_MAP' as const,
  REPLACE_RESOURCE_MASK: 'REPLACE_RESOURCE_MASK' as const,
  REPLACE_GCPS: 'REPLACE_GCPS' as const,
  INSERT_RESOURCE_MASK_POINT: 'INSERT_RESOURCE_MASK_POINT' as const,
  REPLACE_RESOURCE_MASK_POINT: 'REPLACE_RESOURCE_MASK_POINT' as const,
  REMOVE_RESOURCE_MASK_POINT: 'REMOVE_RESOURCE_MASK_POINT' as const,
  INSERT_GCP: 'INSERT_GCP' as const,
  REPLACE_GCP: 'REPLACE_GCP' as const,
  REMOVE_GCP: 'REMOVE_GCP' as const,
  SET_TRANSFORMATION: 'SET_TRANSFORMATION' as const,
  SET_RESOURCE_CRS: 'SET_RESOURCE_CRS' as const
}

interface MapsEventMap {
  INSERT_MAP: InsertMap
  REMOVE_MAP: RemoveMap
  REPLACE_RESOURCE_MASK: ReplaceResourceMask
  REPLACE_GCPS: ReplaceGcps
  INSERT_RESOURCE_MASK_POINT: InsertResourceMaskPoint
  REPLACE_RESOURCE_MASK_POINT: ReplaceResourceMaskPoint
  REMOVE_RESOURCE_MASK_POINT: RemoveResourceMaskPoint
  INSERT_GCP: InsertGcp
  REPLACE_GCP: ReplaceGcp
  REMOVE_GCP: RemoveGcp
  SET_TRANSFORMATION: SetTransformation
  SET_RESOURCE_CRS: SetResourceCrs
}

interface IMapsEventTarget extends EventTarget {
  addEventListener<K extends keyof MapsEventMap>(
    type: K,
    listener: (event: CustomEvent<MapsEventMap[K]>) => void,
    options?: AddEventListenerOptions | boolean
  ): void

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener<K extends keyof MapsEventMap>(
    type: K,
    listener: (event: CustomEvent<MapsEventMap[K]>) => void,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void
}

export const MapsEventTarget = EventTarget as {
  new (): IMapsEventTarget
  prototype: IMapsEventTarget
}
