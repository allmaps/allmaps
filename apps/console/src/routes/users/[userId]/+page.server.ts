import { getUserId } from '$lib/organizations.js'

import type { PageServerLoad } from './$types'

import type { ConsoleUser } from '../users.remote.js'

type SessionData = {
  data: {
    user?: ConsoleUser
    session?: {
      id: string
      expiresAt?: string | Date
    }
  } | null
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const { sessionData } = await parent()
  const { userId } = params
  const session = sessionData as SessionData
  const sessionUser = session.data?.user
  const isAdmin = sessionUser?.role === 'admin'
  const isCurrentUser = sessionUser ? getUserId(sessionUser.id) === userId : false

  return {
    userId,
    isAdmin,
    isCurrentUser
  }
}
