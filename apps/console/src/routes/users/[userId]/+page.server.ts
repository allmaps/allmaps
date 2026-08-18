import { error } from '@sveltejs/kit'

import { CONSOLE_LIST_LIMIT } from '$lib/limits.js'
import { getUserId } from '$lib/organizations.js'
import { restFetch } from '$lib/server/rest.js'
import { parseResourceId } from '$lib/server/route-params.js'

import type { PageServerLoad } from './$types'
import type { ConsoleUser, ListSummary, Organization } from '$lib/types.js'

export const load: PageServerLoad = async ({ locals, params }) => {
  const userId = parseResourceId(params.userId, 'User')
  const session = await locals.getConsoleSession()
  const sessionUser = session?.user
  const isAdmin = sessionUser?.role === 'admin'
  const isCurrentUser = sessionUser
    ? getUserId(sessionUser.id) === userId
    : false

  if (!isAdmin && !isCurrentUser) {
    error(403, 'You do not have access to this user')
  }

  const [user, organizations, lists] = await Promise.all([
    restFetch<ConsoleUser>(`/users/${encodeURIComponent(userId)}`),
    isAdmin
      ? restFetch<Organization[]>(`/organizations?limit=${CONSOLE_LIST_LIMIT}`)
      : Promise.resolve([]),
    isCurrentUser ? restFetch<ListSummary[]>('/lists') : Promise.resolve([])
  ])

  return {
    userId,
    isAdmin,
    isCurrentUser,
    user,
    organizations,
    lists
  }
}
