/** Shared storage for anonymous public reads. Authentication always bypasses it. */
type ResponseCache = {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<unknown>
}

type CacheOptions = {
  cache: ResponseCache
  namespace: string
  waitUntil: (promise: Promise<unknown>) => void
}

const representationHeaders = ['origin', 'accept', 'accept-encoding']
const supportedVary = new Set([
  ...representationHeaders,
  'cookie',
  'authorization'
])

function cacheKey(request: Request, namespace: string) {
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    !/^\/(maps|images|canvases|manifests|organizations)(\/|\.|$)/.test(
      url.pathname
    ) ||
    /\/(random|users)(\/|$)/.test(url.pathname) ||
    [...request.headers.keys()].some(
      (name) =>
        ['cookie', 'authorization', 'range'].includes(name.toLowerCase()) ||
        name.toLowerCase().startsWith('if-')
    ) ||
    /(?:no-cache|no-store|max-age\s*=\s*"?0"?)(?:\s|,|$)/i.test(
      request.headers.get('Cache-Control') ?? ''
    ) ||
    /no-cache/i.test(request.headers.get('Pragma') ?? '')
  ) {
    return
  }

  // Use a separate URL space. Preserve the exact path and all query parameters;
  // ordering and repeated parameters can affect API semantics and annotation IDs.
  const key = new URL(`/.allmaps-response-cache/${namespace}`, url.origin)
  key.searchParams.set('resource', url.pathname + url.search)
  for (const header of representationHeaders) {
    if (request.headers.has(header)) {
      key.searchParams.set(header, request.headers.get(header)!)
    }
  }
  return new Request(key)
}

function isPublicResponse(response: Response) {
  const directives = (response.headers.get('Cache-Control') ?? '')
    .toLowerCase()
    .split(',')
    .map((value) => value.trim())
  if (
    response.status !== 200 ||
    response.headers.has('Set-Cookie') ||
    !directives.includes('public') ||
    directives.some((value) =>
      /^(private|no-store|no-cache)(=|$)/.test(value)
    ) ||
    (response.headers.get('Vary') ?? '')
      .split(',')
      .some(
        (value) =>
          value.trim() && !supportedVary.has(value.trim().toLowerCase())
      )
  ) {
    return false
  }
  const value = directives.find((value) => /^s-maxage=\d+$/.test(value))
  return value !== undefined && Number(value.split('=')[1]) > 0
}

function withStatus(response: Response, status: 'HIT' | 'MISS' | 'BYPASS') {
  const headers = new Headers(response.headers)
  headers.set('X-Allmaps-Cache', status)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/** Cache hits return before the handler creates a database client. */
export async function fetchWithPublicCache(
  request: Request,
  options: CacheOptions,
  handle: () => Promise<Response>
): Promise<Response> {
  const key = cacheKey(request, options.namespace)
  if (!key) return withStatus(await handle(), 'BYPASS')

  try {
    const cached = await options.cache.match(key)
    if (cached) return withStatus(cached, 'HIT')
  } catch {
    // Cache availability must not determine API availability.
    console.warn('Public response cache lookup failed')
  }

  const response = await handle()
  if (!isPublicResponse(response)) return withStatus(response, 'BYPASS')

  const stored = response.clone()
  const headers = new Headers(stored.headers)
  // Cache API enforces s-maxage. Preserve Date/Age for downstream freshness.
  if (!headers.has('Date')) headers.set('Date', new Date().toUTCString())
  headers.delete('Server-Timing')
  options.waitUntil(
    Promise.resolve()
      .then(() =>
        options.cache.put(key, new Response(stored.body, { headers }))
      )
      .catch(() => {
        console.warn('Public response cache write failed')
      })
  )
  return withStatus(response, 'MISS')
}
