import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { IncomingMessage, ServerResponse } from 'node:http'

export function previewPrefix(base: string) {
  return `${base.replace(/\/$/, '')}/__allmaps/`
}

export function previewModule(base: string) {
  return `export function screenshotImageUrl(key, publishedUrl) {
    return ${JSON.stringify(previewPrefix(base))} + key + '?fallback=' + encodeURIComponent(publishedUrl)
  }`
}

/** Serve capture images and public geometry, keeping cache metadata private. */
export function screenshotPreview(directory: string, base: string) {
  const prefix = previewPrefix(base)
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ) => {
    if (!request.url?.startsWith(prefix)) return next()
    const url = new URL(request.url, 'http://localhost')
    const key = url.pathname.slice(prefix.length)
    if (
      !['GET', 'HEAD'].includes(request.method ?? '') ||
      !/^screenshots\/[a-z0-9]+(?:-[a-z0-9]+)*\/v[1-9][0-9]*\.(webp|geometry\.json)$/.test(
        key
      )
    ) {
      response.statusCode = 404
      response.end()
      return
    }

    // Do not cache redirects either: a capture may be created after this request.
    response.setHeader('Cache-Control', 'no-store')
    try {
      const image = await readFile(path.join(directory, key))
      response.setHeader(
        'Content-Type',
        key.endsWith('.json') ? 'application/json' : 'image/webp'
      )
      response.setHeader('Content-Length', image.length)
      response.end(request.method === 'HEAD' ? undefined : image)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const fallback = url.searchParams.get('fallback')
      if (fallback && URL.canParse(fallback)) {
        const publishedUrl = new URL(fallback)
        if (['http:', 'https:'].includes(publishedUrl.protocol)) {
          response.statusCode = 302
          response.setHeader('Location', publishedUrl.href)
          response.end()
          return
        }
      }
      response.statusCode = 404
      response.end()
    }
  }
}
