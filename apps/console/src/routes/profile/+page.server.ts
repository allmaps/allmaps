import { redirect } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

type SessionData = {
  user?: {
    id?: string
  }
}

export const load: PageServerLoad = async ({ fetch, parent, request }) => {
  const { env } = await parent()
  const headers = new Headers()
  const cookie = request.headers.get('cookie')

  if (cookie) {
    headers.set('cookie', cookie)
  }

  const response = await fetch(`${env.PUBLIC_REST_BASE_URL}/auth/get-session`, {
    credentials: 'include',
    headers,
    signal: AbortSignal.timeout(10_000)
  })
  const sessionData: SessionData | null = response.ok
    ? await response.json()
    : null
  const userId = sessionData?.user?.id

  if (!userId) {
    throw redirect(302, '/')
  }

  throw redirect(302, `/users/${userId}`)
}
