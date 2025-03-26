import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import { getLocalFont } from '../shared/fonts.js'

import type { IRequestStrict } from 'itty-router'

import type { Size } from '@allmaps/types'

import type { QueryOptions, Env } from '../shared/types.js'

export async function generateEditorCard(
  req: IRequestStrict,
  env: Env,
  mapId: string,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  const font = await getLocalFont(req, env, {
    path: 'geograph-bold.woff',
    weight: 500
  })

  const jsx = <div>Allmaps Editor</div>

  return new ImageResponse(jsx, {
    width: size[0],
    height: size[1],
    fonts: [font]
  })
}
