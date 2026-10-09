import { Image as IiifImage } from '@allmaps/iiif-parser'
import type { GeoreferencedMap } from '@allmaps/annotation'
import { normalizeMap, parseMaps } from './model.ts'

// Area is in square meters; scale is image pixels per ground meter. These
// favor neighborhood and city plans, without restricting them to one location.
export const randomMapUrl =
  'https://annotations.allmaps.org/maps/random?' +
  new URLSearchParams({
    minArea: '250000',
    maxArea: '400000000',
    minScale: '0.2',
    maxScale: '20'
  })

const candidateCount = 12
const concurrency = 4
type DecodedImage = { width: number; height: number; close: () => void }
type Options = {
  signal?: AbortSignal
  fetchFn?: typeof fetch
  checkImageData?: boolean
  decodeImage?: (blob: Blob) => Promise<DecodedImage>
}

/** Check browser-readable IIIF metadata, optionally fetching and decoding a
 * sample image too. CORS errors and invalid metadata are always skipped. */
async function checkImage(
  map: GeoreferencedMap,
  fetchFn: typeof fetch,
  decodeImage: (blob: Blob) => Promise<DecodedImage>,
  signal: AbortSignal,
  checkImageData = false
) {
  const service = new URL(map.resource.id.replace(/\/$/, '') + '/info.json')
  if (!['https:', 'http:'].includes(service.protocol)) return
  const response = await fetchFn(service, { signal })
  if (!response.ok) return
  const image = IiifImage.parse(await response.json())
  if (!checkImageData) return { width: image.width, height: image.height }
  const requests = image.getImageRequest({ width: 128, height: 128 }, 'contain')
  const request = Array.isArray(requests) ? requests[0]?.[0] : requests
  if (!request) return
  const sample = await fetchFn(image.getImageUrl(request), { signal })
  if (!sample.ok) return
  const bitmap = await decodeImage(await sample.blob())
  try {
    if (bitmap.width > 0 && bitmap.height > 0)
      return { width: image.width, height: image.height }
  } finally {
    bitmap.close()
  }
}

/** The random endpoint returns one map per call, regardless of `limit`.
 * Bound concurrent requests and each candidate's total network wait. Individual
 * failures never discard successful candidates. */
export async function loadRandomMaps({
  signal,
  fetchFn = fetch,
  checkImageData = false,
  decodeImage = (blob) => createImageBitmap(blob)
}: Options = {}): Promise<GeoreferencedMap[]> {
  const results: (GeoreferencedMap | undefined)[] = new Array(candidateCount)
  const seen = new Set<string>()
  const services = new Map<string, ReturnType<typeof checkImage>>()
  let next = 0
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < candidateCount && !signal?.aborted) {
        const index = next++
        const timeout = AbortSignal.timeout(10000)
        const candidateSignal = signal
          ? AbortSignal.any([signal, timeout])
          : timeout
        try {
          const response = await fetchFn(randomMapUrl, {
            cache: 'no-store',
            signal: candidateSignal
          })
          if (!response.ok) continue
          const [map] = parseMaps(await response.json())
          if (!map) continue
          const key =
            map.id ??
            JSON.stringify([map.resource.id, map.gcps, map.resourceMask])
          if (seen.has(key)) continue
          seen.add(key)
          // Reject annotations that Collage cannot transform before probing images.
          normalizeMap(map)
          let available = services.get(map.resource.id)
          if (!available) {
            available = checkImage(
              map,
              fetchFn,
              decodeImage,
              candidateSignal,
              checkImageData
            ).catch(() => undefined)
            services.set(map.resource.id, available)
          }
          const size = await available
          if (size)
            results[index] = { ...map, resource: { ...map.resource, ...size } }
        } catch {
          // A failed API request, malformed annotation or image is just skipped.
        }
      }
    })
  )
  signal?.throwIfAborted()
  const maps = results.filter((map): map is GeoreferencedMap => !!map)
  if (!maps.length)
    throw new Error('No available city-scale maps were found. Try again.')
  return maps
}
