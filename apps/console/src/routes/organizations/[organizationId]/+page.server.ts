import { error } from '@sveltejs/kit'
import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'

import type { OrganizationPermissions } from '@allmaps/api-shared'
import type { Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, params }) => {
  const organizationId = parseResourceId(params.organizationId, 'Organization')
  const permissions = await restFetch<OrganizationPermissions>(
    `/organizations/${encodeURIComponent(organizationId)}/permissions`
  )
  if (!permissions.canView) {
    error(403, 'Organization membership required')
  }

  return {
    organizationId,
    permissions,
    canViewUsers: ['admin', 'collaborator'].includes(
      (await locals.getConsoleSession())?.user?.role ?? ''
    ),
    organization: await restFetch<Organization>(
      `/organizations/${encodeURIComponent(organizationId)}`
    )
  }
}
