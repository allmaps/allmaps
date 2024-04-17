import { decode as decodeJpeg, type UintArrRet } from 'jpeg-js'
import { encode as encodePng } from 'upng-js'

import { IntArrayRenderer, Viewport } from '@allmaps/render'

import { tileToProjectedGeoBbox } from './geo.js'
import { cachedFetch } from './fetch.js'

import type { Size, Bbox, FetchFn } from '@allmaps/types'
import type { Map } from '@allmaps/annotation'
import type { XYZTile, TilejsonOptions } from './types.js'

const TILE_SIZE = 256

function getImageData(input: Uint8ClampedArray) {
  return decodeJpeg(input, { useTArray: true })
}

function getImageDataValue(decodedJpeg: UintArrRet, index: number) {
  return decodedJpeg.data[index]
}

function getImageDataSize(decodedJpeg: UintArrRet): Size {
  return [decodedJpeg.width, decodedJpeg.height]
}

export async function createWarpedTileResponse(
  maps: Map[],
  { x, y, z }: XYZTile,
  options: TilejsonOptions
): Promise<Response> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  let transformationOptions

  if (options['transformation.type']) {
    transformationOptions = {
      type: options['transformation.type']
    }
  }

  const renderer = new IntArrayRenderer<UintArrRet>(
    getImageData,
    getImageDataValue,
    getImageDataSize,
    {
      fetchFn: cachedFetch as FetchFn,
      transformation: transformationOptions,
      createRTree: false
    }
  )

  for (const map of maps) {
    await renderer.addGeoreferencedMap(map)
  }

  const projectedGeoBbox: Bbox = tileToProjectedGeoBbox({ x, y, z })

  const viewport = Viewport.fitBbox(projectedGeoBbox, [TILE_SIZE, TILE_SIZE])
  const warpedTile = await renderer.render(viewport)

  const png = encodePng([warpedTile.buffer], TILE_SIZE, TILE_SIZE, 256)
  const tileResponse = new Response(png, {
    status: 200,
    headers: { 'content-type': 'image/png' }
  })

  return tileResponse
}
