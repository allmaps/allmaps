import { doBboxesIntersect } from '@allmaps/stdlib'

import { BaseRenderer } from './BaseRenderer.js'
import { Viewport } from '../viewport/Viewport.js'
import {
  CacheableRawJpegTile,
  type RawJpegData
} from '../tilecache/CacheableRawJpegTile.js'
import { invertHomogeneousTransform } from '../shared/homogeneous-transform.js'

import type { BaseTransformation } from '@allmaps/transform'

import type { Renderer, IntArrayRenderOptions } from '../shared/types.js'

import type { WarpedMap } from '../maps/WarpedMap.js'

// Type for the WASM module
interface WasmModule {
  decode_jpeg_test(jpegBytes: Uint8Array): { width: number; height: number }
  encode_rgba_to_png(
    pixels: Uint8Array,
    width: number,
    height: number
  ): Uint8Array
  encode_rgba_to_webp(
    pixels: Uint8Array,
    width: number,
    height: number
  ): Uint8Array
  encode_rgba_to_jpeg(
    pixels: Uint8Array,
    width: number,
    height: number,
    quality: number
  ): Uint8Array
  render_warped_tile_rgba(
    jpeg_tiles: Uint8Array,
    tile_offsets: Uint32Array,
    tile_widths: Uint32Array,
    tile_heights: Uint32Array,
    tile_columns: Float64Array,
    tile_rows: Float64Array,
    tile_scale_factors: Float64Array,
    tile_original_widths: Float64Array,
    tile_original_heights: Float64Array,
    transform_type: string,
    transform_args: Float64Array,
    source_points: Float64Array,
    mask_polygon: Float64Array,
    canvas_to_geo: Float64Array,
    output_width: number,
    output_height: number
  ): Uint8Array
  render_warped_tile_rgba_direct(
    rgba_tiles: Uint8Array,
    tile_offsets: Uint32Array,
    tile_widths: Uint32Array,
    tile_heights: Uint32Array,
    tile_columns: Float64Array,
    tile_rows: Float64Array,
    tile_scale_factors: Float64Array,
    tile_original_widths: Float64Array,
    tile_original_heights: Float64Array,
    transform_type: string,
    transform_args: Float64Array,
    source_points: Float64Array,
    mask_polygon: Float64Array,
    canvas_to_geo: Float64Array,
    output_width: number,
    output_height: number
  ): Uint8Array
  render_warped_tile(
    jpeg_tiles: Uint8Array,
    tile_offsets: Uint32Array,
    tile_widths: Uint32Array,
    tile_heights: Uint32Array,
    tile_columns: Float64Array,
    tile_rows: Float64Array,
    tile_scale_factors: Float64Array,
    tile_original_widths: Float64Array,
    tile_original_heights: Float64Array,
    transform_type: string,
    transform_args: Float64Array,
    source_points: Float64Array,
    mask_polygon: Float64Array,
    canvas_to_geo: Float64Array,
    output_width: number,
    output_height: number
  ): Uint8Array
  render_warped_tile_webp(
    jpeg_tiles: Uint8Array,
    tile_offsets: Uint32Array,
    tile_widths: Uint32Array,
    tile_heights: Uint32Array,
    tile_columns: Float64Array,
    tile_rows: Float64Array,
    tile_scale_factors: Float64Array,
    tile_original_widths: Float64Array,
    tile_original_heights: Float64Array,
    transform_type: string,
    transform_args: Float64Array,
    source_points: Float64Array,
    mask_polygon: Float64Array,
    canvas_to_geo: Float64Array,
    output_width: number,
    output_height: number
  ): Uint8Array
  render_warped_tile_jpeg(
    jpeg_tiles: Uint8Array,
    tile_offsets: Uint32Array,
    tile_widths: Uint32Array,
    tile_heights: Uint32Array,
    tile_columns: Float64Array,
    tile_rows: Float64Array,
    tile_scale_factors: Float64Array,
    tile_original_widths: Float64Array,
    tile_original_heights: Float64Array,
    transform_type: string,
    transform_args: Float64Array,
    source_points: Float64Array,
    mask_polygon: Float64Array,
    canvas_to_geo: Float64Array,
    output_width: number,
    output_height: number,
    quality: number
  ): Uint8Array
}

export type OutputFormat = 'png' | 'webp' | 'jpeg'

/**
 * Extract transformation weights in flat format for WASM
 */
function extractTransformWeights(transformation: BaseTransformation): {
  weights: Float64Array
  sourcePoints: Float64Array
} {
  return transformation.getWeights()
}

/**
 * Class that renders WarpedMaps using WASM with raw JPEG tiles
 * Caches raw JPEG bytes and decodes them in WASM for maximum performance
 */
export class WasmRenderer
  extends BaseRenderer<WarpedMap, RawJpegData>
  implements Renderer
{
  wasmModule: WasmModule
  outputFormat: OutputFormat

  constructor(
    wasmModule: WasmModule,
    options?: Partial<IntArrayRenderOptions> & { outputFormat?: OutputFormat }
  ) {
    // Create factory function for raw JPEG tiles
    const decodeJpegForDimensions = (jpegBytes: Uint8ClampedArray) => {
      return wasmModule.decode_jpeg_test(new Uint8Array(jpegBytes))
    }

    super(CacheableRawJpegTile.createFactory(decodeJpegForDimensions), options)
    this.wasmModule = wasmModule
    this.outputFormat = options?.outputFormat || 'png'

    // Note: WASM module should be initialized by the caller before passing to constructor
  }

  /**
   * Render the map for a given viewport using WASM.
   *
   * @param viewport - the viewport to render
   */
  async render(viewport: Viewport): Promise<Uint8Array> {
    this.viewport = viewport

    await Promise.allSettled(this.loadMissingImagesInViewport())

    this.assureProjection()

    this.requestFetchableTiles()
    await this.tileCache.allRequestedTilesLoaded()

    // Initialize output buffer (will be filled by rendering each map)
    const outputWidth = viewport.canvasSize[0]
    const outputHeight = viewport.canvasSize[1]
    const outputPixels = new Uint8ClampedArray(outputWidth * outputHeight * 4)

    // Get canvas-to-geo transform (same for all maps)
    const geoToCanvas = viewport.projectedGeoToCanvasHomogeneousTransform
    const canvasToGeo = new Float64Array(
      invertHomogeneousTransform(geoToCanvas)
    )

    // Iterate over all warped maps and render each that intersects the viewport
    let renderedMapCount = 0
    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      // Check if this map intersects the viewport
      if (
        !doBboxesIntersect(
          viewport.projectedGeoRectangleBbox,
          warpedMap.projectedGeoMaskBbox
        )
      ) {
        continue
      }

      // Get tiles for this map
      const cachedTiles = this.tileCache.getMapCachedTiles(warpedMap.mapId)
      if (cachedTiles.length === 0) {
        continue
      }

      // Render this map using WASM
      const mapPixels = await this.renderMap(
        warpedMap,
        cachedTiles,
        canvasToGeo,
        outputWidth,
        outputHeight
      )

      // Composite into output buffer (overwrite non-transparent pixels)
      for (let i = 0; i < outputPixels.length; i += 4) {
        const alpha = mapPixels[i + 3]
        if (alpha > 0) {
          outputPixels[i] = mapPixels[i]
          outputPixels[i + 1] = mapPixels[i + 1]
          outputPixels[i + 2] = mapPixels[i + 2]
          outputPixels[i + 3] = mapPixels[i + 3]
        }
      }

      renderedMapCount++
    }

    // Encode output based on format
    if (this.outputFormat === 'webp') {
      return this.encodeWebP(outputPixels, outputWidth, outputHeight)
    } else if (this.outputFormat === 'jpeg') {
      return this.encodeJPEG(outputPixels, outputWidth, outputHeight)
    } else {
      return this.encodePNG(outputPixels, outputWidth, outputHeight)
    }
  }

  /**
   * Render a single map using WASM with raw JPEG tiles
   * WASM decodes JPEG natively - no JavaScript decoding needed!
   */
  private async renderMap(
    warpedMap: WarpedMap,
    cachedTiles: any[],
    canvasToGeo: Float64Array,
    outputWidth: number,
    outputHeight: number
  ): Promise<Uint8ClampedArray> {
    // Use raw JPEG bytes from cache - WASM will decode them
    const jpegBuffers: Uint8Array[] = []
    const tileWidths: number[] = []
    const tileHeights: number[] = []
    const tileColumns: number[] = []
    const tileRows: number[] = []
    const tileScaleFactors: number[] = []
    const tileOriginalWidths: number[] = []
    const tileOriginalHeights: number[] = []

    for (const cachedTile of cachedTiles) {
      const tile = cachedTile.fetchableTile.tile

      // cachedTile.data contains raw JPEG bytes (not decoded!)
      const rawJpegData = cachedTile.data as RawJpegData

      // Get raw JPEG bytes - WASM will decode (convert to Uint8Array for compatibility)
      jpegBuffers.push(new Uint8Array(rawJpegData.jpegBytes))

      // Store tile metadata
      tileColumns.push(tile.column)
      tileRows.push(tile.row)
      tileScaleFactors.push(tile.tileZoomLevel.scaleFactor)
      tileOriginalWidths.push(tile.tileZoomLevel.originalWidth)
      tileOriginalHeights.push(tile.tileZoomLevel.originalHeight)
      tileWidths.push(rawJpegData.width)
      tileHeights.push(rawJpegData.height)
    }

    // Concatenate all JPEG buffers
    const totalLength = jpegBuffers.reduce((sum, buf) => sum + buf.length, 0)
    const concatenatedJpeg = new Uint8Array(totalLength)
    const tileOffsets = new Uint32Array(jpegBuffers.length)
    let offset = 0
    for (let i = 0; i < jpegBuffers.length; i++) {
      tileOffsets[i] = offset
      concatenatedJpeg.set(jpegBuffers[i], offset)
      offset += jpegBuffers[i].length
    }

    // Extract transformation
    const transformer = warpedMap.projectedTransformer
    const transformation = transformer.getToResourceTransformation()
    const { weights, sourcePoints } = extractTransformWeights(transformation)
    const transformType = transformation.type

    // Get resource mask
    const maskPolygon = new Float64Array(
      warpedMap.resourceMask.flatMap((p: [number, number]) => [p[0], p[1]])
    )

    // Call WASM renderer with raw JPEG tiles - WASM decodes them!
    // This is 3.1× faster than JavaScript JPEG decoding
    const rgbaPixels = this.wasmModule.render_warped_tile_rgba(
      concatenatedJpeg,
      tileOffsets,
      new Uint32Array(tileWidths),
      new Uint32Array(tileHeights),
      new Float64Array(tileColumns),
      new Float64Array(tileRows),
      new Float64Array(tileScaleFactors),
      new Float64Array(tileOriginalWidths),
      new Float64Array(tileOriginalHeights),
      transformType,
      weights,
      sourcePoints,
      maskPolygon,
      canvasToGeo,
      outputWidth,
      outputHeight
    )

    return new Uint8ClampedArray(rgbaPixels)
  }

  /**
   * Encode RGBA pixels to PNG using WASM
   */
  private encodePNG(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
  ): Uint8Array {
    return this.wasmModule.encode_rgba_to_png(
      new Uint8Array(pixels),
      width,
      height
    )
  }

  /**
   * Encode RGBA pixels to WebP using WASM
   */
  private encodeWebP(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
  ): Uint8Array {
    return this.wasmModule.encode_rgba_to_webp(
      new Uint8Array(pixels),
      width,
      height
    )
  }

  /**
   * Encode RGBA pixels to JPEG using WASM
   */
  private encodeJPEG(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    quality: number = 85
  ): Uint8Array {
    return this.wasmModule.encode_rgba_to_jpeg(
      new Uint8Array(pixels),
      width,
      height,
      quality
    )
  }
}
