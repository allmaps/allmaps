import { webp, jpeg } from 'itty-router'

import type { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'
import * as wasmModule from '@allmaps/render-wasm'

/**
 * Convert PNG ImageResponse to JPEG with configurable quality
 * Uses WASM for fast native conversion (~10-25× faster than JS libraries)
 *
 * @param pngImageResponse - Promise that resolves to ImageResponse (PNG from vercel-og)
 * @param quality - JPEG quality (1-100, default 75). Lower = smaller file, worse quality
 * @returns Response with JPEG image data
 */
export async function toJpgImageResponse(
  pngImageResponse: Promise<ImageResponse>,
  quality: number = 75
): Promise<Response> {
  try {
    const response = await pngImageResponse
    const pngBuffer = await response.arrayBuffer()

    const jpegBytes = wasmModule.convert_png_to_jpeg(
      new Uint8Array(pngBuffer),
      quality
    )

    // Check if conversion failed (WASM returns empty array on error)
    if (jpegBytes.length === 0) {
      console.error('PNG to JPEG conversion failed - WASM returned empty data')
      throw new Error('PNG to JPEG conversion failed')
    }

    return jpeg(jpegBytes)
  } catch (error) {
    console.error('Error in toJpgImageResponse:', error)
    throw error
  }
}

/**
 * Convert PNG ImageResponse to WebP (lossless)
 * Uses WASM for fast native conversion
 * WebP files are typically 25-30% smaller than PNG while maintaining perfect quality
 *
 * @param pngImageResponse - Promise that resolves to ImageResponse (PNG from vercel-og)
 * @returns Response with WebP image data
 */
export async function toWebPImageResponse(
  pngImageResponse: Promise<ImageResponse>
): Promise<Response> {
  const response = await pngImageResponse
  const pngBuffer = await response.arrayBuffer()

  const webpBytes = wasmModule.convert_png_to_webp(new Uint8Array(pngBuffer))

  // Check if conversion failed (WASM returns empty array on error)
  if (webpBytes.length === 0) {
    console.error('PNG to WebP conversion failed - WASM returned empty data')
    throw new Error('PNG to WebP conversion failed')
  }

  return webp(webpBytes)
}
