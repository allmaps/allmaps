import type { TransformationType } from '@allmaps/transform'

export type Env = {
  USE_CACHE: boolean
  API_BASE_URL: string
  ASSETS: Fetcher
}

export type CFArgs = [Env, ExecutionContext]

// TODO: align this with TransformationOptions from @allmaps/render
export type TransformationOptions = {
  'transformation.type': TransformationType
}

export type QueryOptions = TransformationOptions & {
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
