import { describe, it, expect, beforeAll } from 'vitest'
import { parseAnnotation } from '@allmaps/annotation'
import { WasmRenderer, type OutputFormat } from '@allmaps/render/wasm'
import { IntArrayRenderer } from '@allmaps/render/intarray'
import { Viewport } from '@allmaps/render'
import { bboxToRectangle } from '@allmaps/stdlib'
import { decode as decodeJpeg, type UintArrRet } from 'jpeg-js'
import { encode as encodePng } from 'upng-js'

import * as wasmModule from '../../../packages/render-wasm/pkg-nodejs/allmaps_render_wasm.js'

import pixelmatch from 'pixelmatch'
import UPNG from 'upng-js'

import { readFile } from 'fs/promises'

import { join, dirname } from 'path'

import { fileURLToPath } from 'url'
import { xyzTileToProjectedGeoBbox } from '../src/geo.js'

import type { Bbox, FetchFn } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  XYZTile,
  TransformationOptions,
  TileResolution
} from '../src/types.js'

// @ts-ignore - import.meta.url is available in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TILE_WIDTH = 256
const TEST_TIMEOUT = 60000

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

// Node.js version of createWarpedTileResponseWasm (using Node.js WASM module)
async function createWarpedTileResponseWasm(
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  { x, y, z }: XYZTile,
  resolution: TileResolution = 'normal',
  format: OutputFormat = 'png'
): Promise<Uint8Array> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const renderer = new WasmRenderer(wasmModule, {
    fetchFn: fetch as FetchFn,
    createRTree: false,
    transformationType,
    outputFormat: format
  })

  for (const georeferencedMap of georeferencedMaps) {
    await renderer.addGeoreferencedMap(georeferencedMap)
  }

  const projectedGeoBbox: Bbox = xyzTileToProjectedGeoBbox({ x, y, z })
  const projectedGeoRectangle = bboxToRectangle(projectedGeoBbox)

  const viewport = Viewport.fromSizeAndProjectedGeoPolygon(
    [TILE_WIDTH, TILE_WIDTH],
    [projectedGeoRectangle],
    { devicePixelRatio: resolution === 'retina' ? 2 : 1 }
  )

  return await renderer.render(viewport)
}

// Node.js version of createWarpedTileResponse
async function createWarpedTileResponse(
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  { x, y, z }: XYZTile,
  resolution: TileResolution = 'normal'
): Promise<Uint8Array> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const renderer = new IntArrayRenderer<UintArrRet>(
    getImageData,
    getImageDataValue,
    getImageDataSize,
    {
      fetchFn: fetch as FetchFn,
      createRTree: false,
      transformationType
    }
  )

  for (const georeferencedMap of georeferencedMaps) {
    await renderer.addGeoreferencedMap(georeferencedMap)
  }

  const projectedGeoBbox: Bbox = xyzTileToProjectedGeoBbox({ x, y, z })
  const projectedGeoRectangle = bboxToRectangle(projectedGeoBbox)

  const viewport = Viewport.fromSizeAndProjectedGeoPolygon(
    [TILE_WIDTH, TILE_WIDTH],
    [projectedGeoRectangle],
    { devicePixelRatio: resolution === 'retina' ? 2 : 1 }
  )

  const tileSize = viewport.canvasSize
  const warpedTile = await renderer.render(viewport)

  return new Uint8Array(
    encodePng([warpedTile.buffer as ArrayBuffer], tileSize[0], tileSize[1], 0)
  )
}

// Parse tile path to extract z, x, y coordinates
function parseTilePath(tilePath: string): XYZTile {
  const match = tilePath.match(/(\d+)\/(\d+)\/(\d+)\.png$/)
  if (!match) {
    throw new Error(`Invalid tile path: ${tilePath}`)
  }
  return {
    z: parseInt(match[1], 10),
    x: parseInt(match[2], 10),
    y: parseInt(match[3], 10)
  }
}

interface TileTest {
  name: string
  tile: string
  annotation: string
}

describe('Renderer Tests', () => {
  let tileTests: TileTest[] = []

  beforeAll(async () => {
    // Load test tiles from tiles.json
    const tilesJsonPath = join(__dirname, 'input', 'tiles.json')
    const tilesJson = await readFile(tilesJsonPath, 'utf-8')
    tileTests = JSON.parse(tilesJson)

    expect(tileTests.length).toBeGreaterThan(0)
  })

  describe('Tile Rendering from tiles.json', () => {
    it(
      'should render all tiles correctly with both JS and WASM renderers',
      async () => {
        for (let i = 0; i < tileTests.length; i++) {
          const testCase = tileTests[i]
          console.log(`\nTesting: ${testCase.name}`)
          const inputDir = join(__dirname, 'input')

          // Load annotation
          const annotationPath = join(inputDir, testCase.annotation)
          const annotationJson = await readFile(annotationPath, 'utf-8')
          const annotation = JSON.parse(annotationJson)
          const maps = parseAnnotation(annotation)

          expect(maps.length).toBeGreaterThan(0)

          // Parse tile coordinates
          const tile = parseTilePath(testCase.tile)

          // Render with both renderers
          const wasmPngBytes = await createWarpedTileResponseWasm(
            maps,
            {},
            tile
          )
          const jsPngBytes = await createWarpedTileResponse(maps, {}, tile)

          // Load expected PNG
          const expectedPngPath = join(inputDir, testCase.tile)
          const expectedPngBytes = await readFile(expectedPngPath)

          // Decode all PNGs to raw pixels
          const expectedPng = UPNG.decode(expectedPngBytes.buffer)
          const expectedPixels = new Uint8ClampedArray(
            UPNG.toRGBA8(expectedPng)[0]
          )

          const wasmPng = UPNG.decode(wasmPngBytes.buffer as ArrayBuffer)
          const wasmPixels = new Uint8ClampedArray(UPNG.toRGBA8(wasmPng)[0])

          const jsPng = UPNG.decode(jsPngBytes.buffer as ArrayBuffer)
          const jsPixels = new Uint8ClampedArray(UPNG.toRGBA8(jsPng)[0])

          // Get dimensions from expected image
          const canvasWidth = expectedPng.width
          const canvasHeight = expectedPng.height

          // Compare JS renderer output with expected PNG
          const jsDiffPixels = new Uint8ClampedArray(jsPixels.length)
          const jsNumDiffPixels = pixelmatch(
            jsPixels,
            expectedPixels,
            jsDiffPixels,
            canvasWidth,
            canvasHeight,
            { threshold: 0.1 }
          )

          // Compare WASM renderer output with expected PNG
          const wasmDiffPixels = new Uint8ClampedArray(wasmPixels.length)
          const wasmNumDiffPixels = pixelmatch(
            wasmPixels,
            expectedPixels,
            wasmDiffPixels,
            canvasWidth,
            canvasHeight,
            { threshold: 0.1 }
          )

          // Compare JS and WASM outputs with each other
          const interRendererDiffPixels = new Uint8ClampedArray(jsPixels.length)
          const interRendererNumDiffPixels = pixelmatch(
            jsPixels,
            wasmPixels,
            interRendererDiffPixels,
            canvasWidth,
            canvasHeight,
            { threshold: 0.1 }
          )

          const totalPixels = canvasWidth * canvasHeight
          const jsDiffPercentage = (jsNumDiffPixels / totalPixels) * 100
          const wasmDiffPercentage = (wasmNumDiffPixels / totalPixels) * 100
          const interRendererDiffPercentage =
            (interRendererNumDiffPixels / totalPixels) * 100

          // Allow up to 1% difference due to rounding
          expect(jsDiffPercentage, `${testCase.name}: JS diff`).toBeLessThan(1)
          expect(
            wasmDiffPercentage,
            `${testCase.name}: WASM diff`
          ).toBeLessThan(1)
          expect(
            interRendererDiffPercentage,
            `${testCase.name}: JS vs WASM diff`
          ).toBeLessThan(1)
        }
      },
      TEST_TIMEOUT
    )
  })
})
