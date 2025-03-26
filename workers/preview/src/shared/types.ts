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
  from: [number, number]
}
