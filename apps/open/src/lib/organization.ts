export type Organization = {
  id: string
  branding: { name: string; logo: string | null } | null
}

type OrganizationListItem = {
  id: string
  name: string
  logo: string | null
  plan: string | null
  domains: string[]
}

export async function findOrganization(
  restBaseUrl: string,
  hostname: string,
  signal: AbortSignal,
  fetchResource: typeof fetch = fetch
): Promise<Organization | null> {
  try {
    const domain = hostname.toLowerCase()
    const url = new URL('/organizations', restBaseUrl)
    url.searchParams.set('domain', domain)
    const response = await fetchResource(url, {
      credentials: 'omit',
      signal
    })
    if (response.ok) {
      const organizations = (await response.json()) as OrganizationListItem[]
      const organization = organizations.find(({ domains }) =>
        domains.includes(domain)
      )
      if (!organization) return null

      const { id, name, logo, plan } = organization
      return {
        id,
        branding:
          plan === 'supporter' || plan === 'innovator' ? { name, logo } : null
      }
    }
  } catch {
    // Routing works independently of the organization lookup.
  }
  return null
}
