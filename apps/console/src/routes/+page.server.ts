import { restFetch } from '$lib/server/rest.js'
import type { ConsoleUser } from '$lib/types.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getConsoleSession()
  if (
    !session?.user ||
    ['admin', 'collaborator'].includes(session.user.role ?? '')
  ) {
    return { hasOrganizations: false }
  }
  const user = await restFetch<ConsoleUser>(
    `/users/${encodeURIComponent(session.user.id)}`
  )
  return { hasOrganizations: Boolean(user.organizations?.length) }
}
