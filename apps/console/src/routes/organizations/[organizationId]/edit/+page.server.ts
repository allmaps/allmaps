import { error } from '@sveltejs/kit'
import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'
import type { Organization } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.getConsoleSession()
  if (
    !session?.user?.role
      ?.split(',')
      .map((role) => role.trim())
      .includes('admin')
  )
    error(403, 'Only admins can edit organizations')
  const organizationId = parseResourceId(params.organizationId, 'Organization')
  return {
    organizationId,
    organization: await restFetch<Organization>(
      `/organizations/${encodeURIComponent(organizationId)}`
    )
  }
}
