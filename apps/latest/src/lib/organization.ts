import { error } from '@sveltejs/kit'

export type PartnerOrganization = {
  slug: string
  name: string
}

export async function fetchPartnerOrganization(
  fetch: typeof globalThis.fetch,
  mapsApiBaseUrl: string,
  slug: string
): Promise<PartnerOrganization> {
  const url = new URL(`${mapsApiBaseUrl.replace(/\/$/, '')}/organizations`)
  url.searchParams.set('slug', slug)

  const signal = AbortSignal.timeout(10_000)
  let response: Response
  let organizations: unknown
  try {
    response = await fetch(url, { signal })
    if (response.ok) {
      organizations = await response.json()
    }
  } catch {
    if (signal.aborted) {
      error(504, 'Organization lookup timed out. Please try again.')
    }
    error(502, 'Unable to load organization')
  }
  if (!response.ok) {
    error(502, 'Unable to load organization')
  }

  if (!Array.isArray(organizations)) {
    error(502, 'Invalid organization response')
  }

  const organization = organizations.find(
    (organization) =>
      organization?.slug === slug &&
      typeof organization.name === 'string' &&
      ['innovator', 'supporter'].includes(organization.plan)
  )
  if (!organization) {
    error(404, 'Partner organization not found')
  }

  return { slug: organization.slug, name: organization.name }
}
