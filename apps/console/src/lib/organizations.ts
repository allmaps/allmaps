export function getResourceId(resourceIdOrUrl: string) {
  try {
    const url = new URL(resourceIdOrUrl)
    return url.pathname.split('/').filter(Boolean).at(-1) ?? resourceIdOrUrl
  } catch {
    return resourceIdOrUrl
  }
}

export const getOrganizationId = getResourceId
export const getUserId = getResourceId
