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

function getImageTitle(
  image: ApiImage,
  canvas: ApiCanvas,
  manifest: ApiManifest
) {
  const labels = [getLabel(manifest.label), getLabel(canvas.label)]
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

function getOrganizationManifest(
  organization: ApiOrganization,
  image: ApiImage
): { canvas: ApiCanvas; manifest: ApiManifest } | undefined {
  const organizationDomains = new Set(organization.domains.map(normalizeDomain))

  for (const canvas of image.canvases) {
    for (const manifest of canvas.manifests) {
      let manifestUrl: URL

      try {
        manifestUrl = new URL(manifest.uri)
      } catch {
        continue
      }

      if (
        (manifestUrl.protocol === 'http:' ||
          manifestUrl.protocol === 'https:') &&
        organizationDomains.has(manifestUrl.hostname.toLowerCase())
      ) {
        return { canvas, manifest }
      }
    }
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
  url.searchParams.set('requireOrganizationManifest', 'true')

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
  organization: ApiOrganization,
  image: ApiImage
): Example | undefined {
  const selectedManifest = getOrganizationManifest(organization, image)

  if (!selectedManifest) {
    return
  }

  const { canvas, manifest } = selectedManifest

  return {
    organizationId: organization.id,
    title: getImageTitle(image, canvas, manifest),
    manifestId: manifest.uri,
    imageId: image.uri
  }
}

export function imagesToExamples(
  organization: ApiOrganization,
  images: ApiImage[]
) {
  const seenImageIds = new Set<string>()
  const examples: Example[] = []

  for (const image of images) {
    const example = imageToExample(organization, image)

    if (example && !seenImageIds.has(example.imageId)) {
      seenImageIds.add(example.imageId)
      examples.push(example)
    }
  }

  return examples
}

export function imagesToExamplesByOrganizationId(
  images: ApiImage[],
  organizations: ApiOrganization[]
) {
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
    organizations.map((organization) => {
      const organizationId = getApiResourceId(organization.id)

      return [
        organizationId,
        imagesToExamples(
          organization,
          imagesByOrganizationId.get(organizationId) ?? []
        )
      ]
    })
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

export function shuffleImages(images: ApiImage[]) {
  return shuffleItems(images)
}

export function shuffleOrganizations(organizations: ApiOrganization[]) {
  return shuffleItems(organizations)
}
