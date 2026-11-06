import { parseAnnotation } from '@allmaps/annotation'
import { error } from '@sveltejs/kit'
import { createMaskedMap } from '$lib/masked-map.js'
import { readImageSizeLimits } from '$lib/responsive-image.js'

// Called only from server loads: at build time when prerendering, and on the
// development server. The browser receives the prepared image and SVG geometry.
export async function loadMaskedMap(
  fetch: typeof globalThis.fetch,
  annotationUrl: string
) {
  const response = await fetch(annotationUrl, {
    signal: AbortSignal.timeout(30_000)
  }).catch(() => {
    error(502, `Could not fetch map annotation: ${annotationUrl}`)
  })
  if (!response.ok) {
    error(502, `Could not load ${annotationUrl}: ${response.status}`)
  }

  const maps = parseAnnotation(await response.json())
  if (maps.length !== 1) {
    throw new Error(
      `Expected one map at ${annotationUrl}, received ${maps.length}`
    )
  }

  const map = maps[0]
  const serviceUrl = map.resource.id.replace(/\/$/, '')
  // Prepare the partnership brochure's image limits on the server. If service
  // metadata is unavailable, use the annotation's dimensions and fallback limits.
  const info = await fetch(`${serviceUrl}/info.json`, {
    signal: AbortSignal.timeout(15_000)
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as Record<string, unknown>
    })
    .catch((cause) => {
      console.warn(`Could not read image limits for ${serviceUrl}: ${cause}`)
      return undefined
    })

  if (!map.resource.width || !map.resource.height) {
    const { width, height } = info ?? {}
    if (
      typeof width !== 'number' ||
      !Number.isFinite(width) ||
      width <= 0 ||
      typeof height !== 'number' ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      throw new Error(`Invalid image dimensions for ${annotationUrl}`)
    }
    map.resource.width = width
    map.resource.height = height
  }

  const limits = info ? readImageSizeLimits(info) : {}
  // Use a conservative width when service metadata is unavailable.
  limits.maxWidth = Math.min(limits.maxWidth ?? Infinity, info ? Infinity : 600)
  return createMaskedMap(map, annotationUrl, undefined, limits)
}
