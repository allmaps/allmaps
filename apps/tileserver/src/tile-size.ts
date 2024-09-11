import type { Size } from '@allmaps/types'

import type { TileResolution } from './types.js'

const TILE_WIDTH = 256

export function getTileSize(resulution: TileResolution = 'normal'): Size {
  const width = TILE_WIDTH * (resulution === 'retina' ? 2 : 1)
  return [width, width]
}
