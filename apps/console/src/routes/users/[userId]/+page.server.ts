import type { PageServerLoad } from './$types'

import type { ConsoleUser } from '../users.remote.js'

type Organization = {
  id: string
  name: string
  slug: string
  createdAt: string
}

type OrgMembership = {
  userRole: string
  createdAt?: string
  organization: {
    id: string
    slug: string
    name: string
    logo?: string | null
    createdAt?: string
  }
}

type SessionData = {
  data: {
    user?: ConsoleUser
    session?: {
      id: string
      expiresAt?: string | Date
    }
  } | null
}

export const load: PageServerLoad = async ({
  params,
  fetch,
  parent,
  request
}) => {
  const { env } = await parent()
  const { userId } = params
  const headers = new Headers()
  const cookie = request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  const requestOptions = {
    credentials: 'include' as const,
    headers,
    signal: AbortSignal.timeout(10_000)
  }

  const sessionResponse = await fetch(
    `${env.PUBLIC_REST_BASE_URL}/auth/get-session`,
    requestOptions
  )
  const sessionData: SessionData = sessionResponse.ok
    ? { data: await sessionResponse.json() }
    : { data: null }
  const sessionUser = sessionData.data?.user
  const isAdmin = sessionUser?.role === 'admin'
  const isCurrentUser = sessionUser?.id === userId

  let user: ConsoleUser | null = null
  let organizations: Organization[] = []

  if (isAdmin) {
    const [userResponse, organizationsResponse] = await Promise.all([
      fetch(`${env.PUBLIC_REST_BASE_URL}/users/${userId}`, requestOptions),
      fetch(`${env.PUBLIC_REST_BASE_URL}/organizations`, requestOptions)
    ])

    user = userResponse.ok ? await userResponse.json() : null
    organizations = organizationsResponse.ok
      ? await organizationsResponse.json()
      : []
  } else if (isCurrentUser && sessionUser) {
    user = sessionUser
  }

  const userOrganizations: OrgMembership[] = user?.organizations ?? []

  return {
    user,
    organizations,
    userOrganizations,
    isAdmin,
    isCurrentUser,
    sessionData
  }
}
