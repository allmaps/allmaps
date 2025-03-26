import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import type { Size } from '@allmaps/types'

import type { QueryOptions } from '../shared/types.js'

export async function generateEditorCard(
  mapId: string,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  // const font = await getLocalFont(req, env, {
  //   path: 'geograph-bold.woff',
  //   weight: 500
  // })

  throw new Error('Not implemented')
}
