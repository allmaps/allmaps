import { decode as decodeJpeg, type UintArrRet } from 'jpeg-js'
import { computeBbox, bboxToRectangle } from '@allmaps/stdlib'

import { parseAnnotation } from '@allmaps/annotation'

import { Viewport } from '@allmaps/render'
import { WasmRenderer } from '@allmaps/render/wasm'
import { IntArrayRenderer } from '@allmaps/render/intarray'

import { xyzTileToProjectedGeoBbox } from '../src/geo.js'

import * as wasmModule from '../../../packages/render-wasm/pkg-nodejs/allmaps_render_wasm.js'

import type { Bbox, FetchFn, Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'

const TILE_WIDTH = 256

// Helper functions for IntArrayRenderer
function getImageData(input: Uint8ClampedArray) {
  return decodeJpeg(input, { useTArray: true })
}

function getImageDataValue(decodedJpeg: UintArrRet, index: number) {
  return decodedJpeg.data[index]
}

function getImageDataSize(decodedJpeg: UintArrRet): [number, number] {
  return [decodedJpeg.width, decodedJpeg.height]
}

// Calculate tiles for a map's bounding box
function getTilesForMap(geoBbox: number[], targetZoom = 13) {
  const [minLon, minLat, maxLon, maxLat] = geoBbox
  const lon2tile = (lon: number, zoom: number) =>
    Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const lat2tile = (lat: number, zoom: number) =>
    Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, zoom)
    )

  const tiles = []
  const maxTiles = 4
  for (
    let x = lon2tile(minLon, targetZoom);
    x <= lon2tile(maxLon, targetZoom) && tiles.length < maxTiles;
    x++
  ) {
    for (
      let y = lat2tile(maxLat, targetZoom);
      y <= lat2tile(minLat, targetZoom) && tiles.length < maxTiles;
      y++
    ) {
      tiles.push({ z: targetZoom, x, y })
    }
  }
  return tiles
}

// Create viewport from XYZ tile coordinates
function createViewport(tile: { x: number; y: number; z: number }) {
  const projectedGeoBbox: Bbox = xyzTileToProjectedGeoBbox(tile)
  const projectedGeoRectangle = bboxToRectangle(projectedGeoBbox)
  return Viewport.fromSizeAndProjectedGeoPolygon(
    [TILE_WIDTH, TILE_WIDTH],
    [projectedGeoRectangle]
  )
}

// Benchmark a single map
async function benchmarkMap(
  map: GeoreferencedMap,
  tile: { z: number; x: number; y: number }
) {
  console.log(`\n--- Map: ${map.id} ---`)
  console.log(`Tile: z=${tile.z}, x=${tile.x}, y=${tile.y}`)

  const viewport = createViewport(tile)

  // Create renderers
  const wasmRenderer = new WasmRenderer(wasmModule, {
    fetchFn: fetch as FetchFn,
    createRTree: false
  })

  const jsRenderer = new IntArrayRenderer<UintArrRet>(
    getImageData,
    getImageDataValue,
    getImageDataSize,
    {
      fetchFn: fetch as FetchFn,
      createRTree: false
    }
  )

  await wasmRenderer.addGeoreferencedMap(map)
  await jsRenderer.addGeoreferencedMap(map)

  // Warmup (loads tiles)
  console.log('Warming up...')
  await wasmRenderer.render(viewport)
  await jsRenderer.render(viewport)

  const tileCount = wasmRenderer.tileCache.getCachedTiles().length
  console.log(`Tiles loaded: ${tileCount}`)

  if (tileCount === 0) {
    console.log('⚠️  No tiles loaded, skipping')
    return null
  }

  // Benchmark
  const runs = 5
  const wasmTimes: number[] = []
  const jsTimes: number[] = []

  console.log(`Running ${runs} iterations...`)
  for (let i = 0; i < runs; i++) {
    const wasmStart = performance.now()
    await wasmRenderer.render(viewport)
    wasmTimes.push(performance.now() - wasmStart)

    const jsStart = performance.now()
    await jsRenderer.render(viewport)
    jsTimes.push(performance.now() - jsStart)

    process.stdout.write('.')
  }
  console.log(' Done!')

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b) / arr.length
  const wasmAvg = avg(wasmTimes)
  const jsAvg = avg(jsTimes)
  const speedup = jsAvg / wasmAvg

  console.log(`WASM: ${wasmAvg.toFixed(2)}ms`)
  console.log(`JS:   ${jsAvg.toFixed(2)}ms`)
  console.log(`Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '✅' : '⚠️'}`)

  return { mapId: map.id, tileCount, wasmAvg, jsAvg, speedup }
}

// Main
async function main() {
  console.log('=== WASM vs JS Renderer Benchmark ===\n')

  // Fetch maps
  console.log('Fetching maps from API...')
  const response = await fetch('https://annotations.allmaps.org/maps?limit=20')
  const data = (await response.json()) as { items: any[] }

  // Parse and filter
  const validMaps: GeoreferencedMap[] = []
  for (const annotation of data.items) {
    try {
      const maps = parseAnnotation(annotation)
      validMaps.push(...maps.filter((m) => m.gcps.length >= 3))
    } catch {}
  }

  console.log(`Found ${validMaps.length} valid maps\n`)

  // Benchmark first 3 maps
  const results = []
  for (const map of validMaps.slice(0, 3)) {
    const geoPoints: Point[] = map.gcps.map((gcp) => [gcp.geo[0], gcp.geo[1]])
    const geoBbox = computeBbox(geoPoints)
    const tiles = getTilesForMap(geoBbox, 13)

    if (tiles.length > 0) {
      const result = await benchmarkMap(map, tiles[0])
      if (result) results.push(result)
    }
  }

  // Summary
  if (results.length > 0) {
    const avgSpeedup =
      results.reduce((sum, r) => sum + r.speedup, 0) / results.length
    console.log(`\n=== Average speedup: ${avgSpeedup.toFixed(2)}x ===`)
  }
}

main().catch(console.error)
