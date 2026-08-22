import type { Example } from '$lib/types/shared.js'

export const HOMEPAGE_ORGANIZATION_COUNT = 5
export const HOMEPAGE_EXAMPLES_COUNT = 6
export const ORGANIZATION_EXAMPLES_COUNT = 100

type Fetch = typeof fetch

type ApiLabel = Record<string, string[]> | null

type ApiManifest = {
  id: string
  uri: string
  label: ApiLabel
}

type ApiCanvas = {
  id: string
  uri: string
  label: ApiLabel
  manifests: ApiManifest[]
}

export type ApiImage = {
  id: string
  uri: string
  maps: { id: string }[]
  canvases: ApiCanvas[]
  fetched: boolean
  organization?: {
    id: string
  }
}

export type ApiOrganization = {
  id: string
  name: string
  slug: string
  logo: string | null
  homepage: string | null
  plan: string | null
  displayCollections: boolean
  domains: string[]
  images: string
  canvases: string
  manifests: string
}

export type ExamplesByOrganizationId = Record<string, Example[]>

async function fetchJson<T>(fetchFn: Fetch, url: string) {
  const response = await fetchFn(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return (await response.json()) as T
}

function createApiUrl(restBaseUrl: string, path: string) {
  return new URL(path, `${restBaseUrl.replace(/\/$/, '')}/`)
}

function getLabel(label: ApiLabel) {
  if (!label) {
    return
  }

  return Object.values(label)
    .flat()
    .find((value) => value.trim().length > 0)
}

function getImageTitle(image: ApiImage) {
  const canvas = image.canvases.find((canvas) => getLabel(canvas.label))
  const manifest = image.canvases
    .flatMap((canvas) => canvas.manifests)
    .find((manifest) => getLabel(manifest.label))

  const labels = [
    getLabel(manifest?.label ?? null),
    getLabel(canvas?.label ?? null)
  ]
    .filter((label) => label !== undefined)
    .filter((label, index, labels) => labels.indexOf(label) === index)

  return labels.length > 0 ? labels.join(' - ') : image.uri
}

function normalizeDomain(domain: string) {
  try {
    return new URL(
      domain.includes('://') ? domain : `https://${domain}`
    ).hostname.toLowerCase()
  } catch {
    return domain.toLowerCase()
  }
}

export function getApiResourceId(id: string) {
  try {
    const url = new URL(id)
    return url.pathname.split('/').filter(Boolean).at(-1) ?? id
  } catch {
    return id
  }
}

export function getExampleOrganizationsUrl(restBaseUrl: string) {
  const url = createApiUrl(restBaseUrl, 'organizations')
  url.searchParams.set('displayCollections', 'true')

  return url.toString()
}

export function getExampleOrganizationBySlugUrl(
  restBaseUrl: string,
  organizationSlug: string
) {
  const url = createApiUrl(restBaseUrl, 'organizations')
  url.searchParams.set('displayCollections', 'true')
  url.searchParams.set('slug', organizationSlug)
  url.searchParams.set('limit', '1')

  return url.toString()
}

export function getOrganizationImagesUrl(
  organization: ApiOrganization,
  limit: number
) {
  const url = new URL(organization.images)
  url.searchParams.set('georeferenced', 'false')
  url.searchParams.set('limit', String(limit))

  return url.toString()
}

export function getRandomImageUrl(restBaseUrl: string) {
  const url = createApiUrl(restBaseUrl, 'images/random')
  url.searchParams.set('georeferenced', 'false')
  url.searchParams.set('limit', '1')

  return url.toString()
}

export function getRandomOrganizationImagesUrl(
  restBaseUrl: string,
  organizations: ApiOrganization[],
  limitPerOrganization: number
) {
  const url = createApiUrl(restBaseUrl, 'images/random')
  url.searchParams.set('georeferenced', 'false')

  for (const organizationId of new Set(
    organizations.map((organization) => getApiResourceId(organization.id))
  )) {
    url.searchParams.append('organizationId', organizationId)
  }

  url.searchParams.set('limitPerOrganization', String(limitPerOrganization))

  return url.toString()
}

export async function fetchExampleOrganizations(
  fetchFn: Fetch,
  restBaseUrl: string
) {
  const organizations = await fetchJson<ApiOrganization[]>(
    fetchFn,
    getExampleOrganizationsUrl(restBaseUrl)
  )

  return organizations
}

export async function fetchExampleOrganizationBySlug(
  fetchFn: Fetch,
  restBaseUrl: string,
  organizationSlug: string
) {
  const organizations = await fetchJson<ApiOrganization[]>(
    fetchFn,
    getExampleOrganizationBySlugUrl(restBaseUrl, organizationSlug)
  )

  return organizations[0]
}

export async function fetchUngeoreferencedImages(
  fetchFn: Fetch,
  organization: ApiOrganization,
  limit: number
) {
  return fetchJson<ApiImage[]>(
    fetchFn,
    getOrganizationImagesUrl(organization, limit)
  )
}

export async function fetchRandomUngeoreferencedImage(
  fetchFn: Fetch,
  restBaseUrl: string
) {
  const images = await fetchJson<ApiImage[]>(
    fetchFn,
    getRandomImageUrl(restBaseUrl)
  )

  return images[0]
}

export async function fetchRandomOrganizationImages(
  fetchFn: Fetch,
  restBaseUrl: string,
  organizations: ApiOrganization[],
  limitPerOrganization: number
) {
  if (organizations.length === 0) {
    return []
  }

  return fetchJson<ApiImage[]>(
    fetchFn,
    getRandomOrganizationImagesUrl(
      restBaseUrl,
      organizations,
      limitPerOrganization
    )
  )
}

export function imageToExample(
  organization: ApiOrganization | undefined,
  image: ApiImage
): Example {
  return {
    organizationId: organization?.id ?? image.organization?.id ?? '',
    title: getImageTitle(image),
    manifestId: image.canvases[0]?.manifests[0]?.uri,
    imageId: image.uri
  }
}

export function imagesToExamples(
  organization: ApiOrganization | undefined,
  images: ApiImage[]
) {
  const seenImageIds = new Set<string>()
  const examples: Example[] = []

  for (const image of images) {
    const example = imageToExample(organization, image)

    if (!seenImageIds.has(example.imageId)) {
      seenImageIds.add(example.imageId)
      examples.push(example)
    }
  }

  return examples
}

export function imagesToExamplesByOrganizationId(images: ApiImage[]) {
  const imagesByOrganizationId = new Map<string, ApiImage[]>()

  for (const image of images) {
    if (!image.organization?.id) {
      continue
    }

    const organizationId = getApiResourceId(image.organization.id)
    const organizationImages = imagesByOrganizationId.get(organizationId) ?? []
    organizationImages.push(image)
    imagesByOrganizationId.set(organizationId, organizationImages)
  }

  return Object.fromEntries(
    Array.from(
      imagesByOrganizationId,
      ([organizationId, organizationImages]) => [
        organizationId,
        imagesToExamples(undefined, organizationImages)
      ]
    )
  ) satisfies ExamplesByOrganizationId
}

export function getImageOpenUrl(image: ApiImage) {
  return image.canvases[0]?.manifests[0]?.uri ?? image.uri
}

export function isCallbackAllowedByOrganizations(
  callback: string,
  organizations: ApiOrganization[]
) {
  let url: URL

  try {
    url = new URL(callback)
  } catch {
    return false
  }

  const callbackHostname = url.hostname.toLowerCase()

  return organizations.some((organization) =>
    organization.domains.some(
      (domain) => normalizeDomain(domain) === callbackHostname
    )
  )
}

function shuffleItems<T>(items: T[]) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item)
}

function getSeededSortValue(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function shuffleImages(images: ApiImage[]) {
  return shuffleItems(images)
}

export function shuffleOrganizations(
  organizations: ApiOrganization[],
  seed: string
) {
  return organizations
    .map((organization, index) => ({
      organization,
      index,
      sort: getSeededSortValue(`${seed}:${getApiResourceId(organization.id)}`)
    }))
    .sort((a, b) => a.sort - b.sort || a.index - b.index)
    .map(({ organization }) => organization)
}
