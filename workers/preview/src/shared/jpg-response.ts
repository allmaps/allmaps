import { decode as decodePng } from 'upng-js'
import { encode as encodeJpg } from 'jpeg-js'

import type { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

export async function toJpgImageResponse(
  pngImageResponse: ImageResponse
): Promise<Response> {
  const pngArrayBuffer = await pngImageResponse.arrayBuffer()
  const decodedImage = decodePng(pngArrayBuffer)

  const jpgArrayBuffer = encodeJpg(decodedImage, 40)
  return new Response(jpgArrayBuffer.data, {
    headers: {
      'Content-Type': 'image/jpeg'
    }
  })
}
