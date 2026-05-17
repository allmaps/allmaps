import type { PageLoad } from './$types'
import { authClient } from '$lib/auth-client'

type User = {
  id: string
  name?: string | null
  slug?: string | null
  email?: string | null
  banned?: boolean | null
  role?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
  emailVerified?: boolean | null
  organizations?: {
    userRole: string
    createdAt?: string
    organization: {
      id: string
      slug: string
      name: string
      logo?: string | null
      createdAt?: string
    }
  }[]
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
  const { env } = await parent()
  const { userId } = params
  const sessionData = await authClient.getSession()
  const sessionUser = sessionData.data?.user
  const isAdmin = sessionUser?.role === 'admin'
  const isCurrentUser = sessionUser?.id === userId

  let user: User | null = null
  let organizationsResponse: Response | null = null

  if (isAdmin) {
    const [userResponse, orgsResponse] = await Promise.all([
      fetch(`${env.PUBLIC_REST_BASE_URL}/users/${userId}`, {
        credentials: 'include'
      }),
      fetch(`${env.PUBLIC_REST_BASE_URL}/organizations`, {
        credentials: 'include'
      })
    ])

    user = userResponse.ok ? await userResponse.json() : null
    organizationsResponse = orgsResponse
  } else if (isCurrentUser && sessionUser) {
    user = sessionUser as User
  }

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

  const organizations: Organization[] = organizationsResponse?.ok
    ? await organizationsResponse.json()
    : []
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
