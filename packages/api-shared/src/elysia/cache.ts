type HeaderValue = string | number

export type CacheControlPreset =
  | 'private-no-store'
  | 'public-short'
  | 'public-medium'
  | 'public-long'
  | 'public-immutable'

const cacheControlByPreset: Record<CacheControlPreset, string> = {
  'private-no-store': 'private, no-store',
  'public-short':
    'public, max-age=30, s-maxage=120, stale-while-revalidate=600',
  'public-medium':
    'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
  'public-long':
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  'public-immutable': 'public, immutable, max-age=31536000, s-maxage=31536000'
}

export function setCacheControl(
  set: { headers: Record<string, HeaderValue> },
  preset: CacheControlPreset
) {
  set.headers['Cache-Control'] = cacheControlByPreset[preset]
}
