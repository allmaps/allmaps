import type { World } from '@allmaps/render'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class = { new (...args: any[]): any }

export type BaseWarpedMapSource = Class & {
  getRevision(): number
  getWorld(): World
}

// export type BaseWarpedMapLayer = Class & {
//   // getRevision(): number
//   // getWorld(): World
//   // renderer
// }

// export type BaseWarpedMapLayers<T> = T & {
//   // getRevision(): number
//   // getWorld(): World
//   renderer
// }

export type BaseViewState = {
  rotation: number
  center: number[]
  resolution: number
}

export type BaseViewHint = {
  ANIMATING: number
  INTERACTING: number
}

export type BaseFrameState = {
  size: number[]
  viewState: BaseViewState
  viewHints: number[]
  extent: number[] | null
  coordinateToPixelTransform: number[]
}

export type BaseOLWarpedMapEvent = Class
