import { redirect } from '@sveltejs/kit'

import type { PageLoad } from './$types'

import { authClient } from '$lib/auth-client'

export const load: PageLoad = async () => {
  const sessionData = await authClient.getSession()
  const userId = sessionData.data?.user?.id

  if (!userId) {
    throw redirect(302, '/')
  }

  throw redirect(302, `/users/${userId}`)
}
