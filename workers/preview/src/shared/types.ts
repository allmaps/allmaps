import type { TransformationType } from '@allmaps/transform'
import type { OutputFormat } from '@allmaps/render/wasm'
import type { PreviewEnv } from '@allmaps/env/preview'

// TODO: align this with TransformationOptions from @allmaps/render
export type TransformationOptions = {
  'transformation.type': TransformationType
}

export type QueryOptions = TransformationOptions & {
  bounds: [number, number, number, number]
  fit: 'contain' | 'cover' | 'best'
  width: number
  height: number
  background: string
  format: OutputFormat
  // TODO: these options are specific to Allmaps Here, move them to a separate type
  color: Color
  from: [number, number]
}

export type Color = {
  r: number
  g: number
  b: number
}

export type Crop = {
  size: {
    width: number
    height: number
  }
  region: {
    x: number
    y: number
    width: number
    height: number
  }
  coordinates: number[]
}

export type ResourceWithId = {
  type: 'map' | 'image' | 'manifest'
  id: string
}

type AssetsBinding = {
  fetch: (request: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export type Env = PreviewEnv & {
  ASSETS: AssetsBinding
}
