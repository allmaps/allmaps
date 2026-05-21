import type { Organization } from '$lib/types.js'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({
  params,
  fetch,
  parent,
  request
}) => {
  const { env } = await parent()
  const { organizationId } = params
  const headers = new Headers()
  const cookie = request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  const organizationResponse = await fetch(
    `${env.PUBLIC_REST_BASE_URL}/organizations/${organizationId}`,
    {
      credentials: 'include',
      headers,
      signal: AbortSignal.timeout(10_000)
    }
  )
  const organization: Organization | undefined = organizationResponse.ok
    ? await organizationResponse.json()
    : undefined

  return {
    organization
  }
}
