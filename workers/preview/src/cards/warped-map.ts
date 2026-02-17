import { generateWarpedMapImage } from '../shared/warped-map-wasm.js'

import type { IRequestStrict } from 'itty-router'

import type { QueryOptions, Env, ResourceWithId } from '../shared/types.js'

import type { Size } from '@allmaps/types'

export async function generateWarpedMapCard(
  req: IRequestStrict,
  env: Env,
  resourceWithId: ResourceWithId,
  size: Size,
  options: Partial<QueryOptions>
) {
  const imageResponse = await generateWarpedMapImage(
    resourceWithId,
    size,
    options
  )

  return imageResponse
}
