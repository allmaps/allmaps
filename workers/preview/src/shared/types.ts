import type { TransformationType } from '@allmaps/transform'

export type Env = {
  USE_CACHE: boolean
  API_BASE_URL: string
  // @ts-expect-error Fetcher not found
  ASSETS: Fetcher
}

// @ts-expect-error ExecutionContext not found
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
