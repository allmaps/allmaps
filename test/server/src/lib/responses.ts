import type { CorsMode } from './types.ts'

export function withCors(response: Response, corsMode: CorsMode): Response {
  if (corsMode === 'cors') {
    response.headers.set('access-control-allow-origin', '*')
    response.headers.set('access-control-allow-methods', 'GET, OPTIONS')
    response.headers.set('access-control-allow-headers', '*')
  }

  return response
}

export function jsonResponse(
  data: unknown,
  corsMode: CorsMode,
  status = 200
): Response {
  return withCors(
    new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    }),
    corsMode
  )
}

export function textResponse(
  text: string,
  corsMode: CorsMode,
  status = 200
): Response {
  return withCors(
    new Response(text, {
      status,
      headers: {
        'content-type': 'text/plain; charset=utf-8'
      }
    }),
    corsMode
  )
}

export function imageResponse(
  image: Buffer,
  corsMode: CorsMode,
  contentType: string
): Response {
  const imageArrayBuffer = image.buffer.slice(
    image.byteOffset,
    image.byteOffset + image.byteLength
  ) as ArrayBuffer

  return withCors(
    new Response(imageArrayBuffer, {
      headers: {
        'cache-control': 'no-store',
        'content-type': contentType
      }
    }),
    corsMode
  )
}
