import { restFetch } from '$lib/server/rest.js'
import { CONSOLE_LIST_LIMIT } from '$lib/limits.js'
import { getOrganizationId, getUserId } from '$lib/organizations.js'

import type { ConsoleUser, Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getConsoleSession()
  const isAllmapsAdmin = session?.user?.role === 'admin'
  const canViewUsers = isAllmapsAdmin || session?.user?.role === 'collaborator'
  if (canViewUsers) {
    return {
      isAllmapsAdmin,
      canViewUsers,
      organizations: await restFetch<Organization[]>(
        `/organizations?limit=${CONSOLE_LIST_LIMIT}`
      )
    }
  }
  const user = await restFetch<ConsoleUser>(
    `/users/${encodeURIComponent(getUserId(session!.user!.id))}`
  )
  const memberships = user.organizations ?? []
  const organizationRequests: Promise<Organization[]>[] = []
  for (
    let offset = 0;
    offset < memberships.length;
    offset += CONSOLE_LIST_LIMIT
  ) {
    const params = new URLSearchParams({ limit: String(CONSOLE_LIST_LIMIT) })
    for (const membership of memberships.slice(
      offset,
      offset + CONSOLE_LIST_LIMIT
    )) {
      params.append('id', getOrganizationId(membership.organization.id))
    }
    organizationRequests.push(
      restFetch<Organization[]>(`/organizations?${params}`)
    )
  }
  return {
    isAllmapsAdmin,
    canViewUsers,
    organizations: (await Promise.all(organizationRequests)).flat()
  }
}
