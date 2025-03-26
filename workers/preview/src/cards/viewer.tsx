import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import type { Size } from '@allmaps/types'

import type { QueryOptions } from '../shared/types.js'

export async function generateViewerCard(
  mapId: string,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  throw new Error('Not implemented')
}
