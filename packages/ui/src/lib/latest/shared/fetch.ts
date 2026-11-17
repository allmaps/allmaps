import { parseAnnotation } from '@allmaps/annotation'
import { getMapQueryCredentials } from '@allmaps/stdlib'

type LatestMapsOptions = {
  count: number
  mapsApiBaseUrl: string
  annotationsApiBaseUrl: string
  organizationSlug?: string
}

export async function fetchLatestMaps(
  {
    count,
    mapsApiBaseUrl,
    annotationsApiBaseUrl,
    organizationSlug
  }: LatestMapsOptions,
  fetch: typeof globalThis.fetch = globalThis.fetch
): Promise<unknown[]> {
  const baseUrl = organizationSlug ? annotationsApiBaseUrl : mapsApiBaseUrl
  const path = organizationSlug
    ? `/organizations/${encodeURIComponent(organizationSlug)}`
    : '/maps'
  const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`)
  url.searchParams.set('limit', String(count))

  const response = await fetch(url, {
    credentials: getMapQueryCredentials(count)
  })

  if (!response.ok) {
    throw new Error(`Error fetching latest maps: ${response.status}`)
  }

  const data: unknown = await response.json()
  if (organizationSlug) {
    return parseAnnotation(data)
  }
  if (!Array.isArray(data)) {
    throw new Error('Invalid response')
  }
  return data
}
