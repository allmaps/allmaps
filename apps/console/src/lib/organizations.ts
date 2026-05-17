export function getOrganizationId(organizationIdOrUrl: string) {
  try {
    const url = new URL(organizationIdOrUrl)
    return url.pathname.split('/').filter(Boolean).at(-1) ?? organizationIdOrUrl
  } catch {
    return organizationIdOrUrl
  }
}
