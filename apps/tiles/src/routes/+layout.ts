import { fetchJson } from '@allmaps/stdlib'

import type { LayoutLoad } from './$types'

import type { TileJSON } from '$lib/types.js'

export const load: LayoutLoad = async ({ url }) => {
  const urlParam = url.searchParams.get('url')

  if (urlParam) {
    const tileJson = (await fetchJson(urlParam)) as TileJSON

    return { url: urlParam, tileJson }
  }

  return {}
}
