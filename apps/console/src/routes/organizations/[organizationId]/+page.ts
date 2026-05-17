import type { PageLoad } from './$types'

type Organization = {
  id: string
  name: string
  slug: string
  homepage?: string
  plan?: 'supporter' | 'innovator'
  domains: string[]
  createdAt: string
  users?: {
    role: string
    createdAt: string
    user: {
      id: string
      name: string
      email: string
    }
  }[]
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
  const { env } = await parent()
  const { organizationId } = params

  const organizationResponse = await fetch(
    `${env.PUBLIC_REST_BASE_URL}/organizations/${organizationId}`,
    {
      credentials: 'include'
    }
  )
  const organization: Organization | undefined = organizationResponse.ok
    ? await organizationResponse.json()
    : undefined

  return {
    organization,
    membersData: Promise.resolve({
      data: organization ? { members: organization.users ?? [] } : null
    })
  }
}
