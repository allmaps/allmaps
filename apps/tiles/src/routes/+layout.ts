import { fetchJson } from '@allmaps/stdlib'
import { resolveTileJsonUrl } from '$lib/resolve-tile-json-url.js'

import type { LayoutLoad } from './$types'

import type { TileJSON } from '$lib/types.js'

export const load: LayoutLoad = async ({ url, fetch }) => {
  const urlParam = url.searchParams.get('url')

  if (urlParam) {
    try {
      const tileJson = await fetchJson(
        resolveTileJsonUrl(urlParam),
        undefined,
        fetch
      )

      if (!isTileJson(tileJson)) {
        throw new Error(
          'The URL did not return TileJSON with tiles and bounds.'
        )
      }

      return { url: urlParam, tileJson }
    } catch (error) {
      return {
        url: urlParam,
        error:
          error instanceof Error ? error.message : 'Could not open this URL.'
      }
    }
  }

  return {}
}

function isTileJson(value: unknown): value is TileJSON {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tilejson' in value &&
    typeof value.tilejson === 'string' &&
    (!('attribution' in value) || typeof value.attribution === 'string') &&
    'tiles' in value &&
    Array.isArray(value.tiles) &&
    value.tiles.length > 0 &&
    value.tiles.every((tile) => typeof tile === 'string' && tile.length > 0) &&
    'bounds' in value &&
    Array.isArray(value.bounds) &&
    value.bounds.length === 4 &&
    value.bounds.every(
      (bound) => typeof bound === 'number' && Number.isFinite(bound)
    )
  )
}
