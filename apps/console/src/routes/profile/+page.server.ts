import { redirect } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

type SessionData = {
  user?: {
    id?: string
  }
}

export const load: PageServerLoad = async ({ parent }) => {
  const { sessionData } = await parent()
  const session = sessionData.data as SessionData | null
  const userId = session?.user?.id

  if (!userId) {
    throw redirect(302, '/')
  }

  throw redirect(302, `/users/${userId}`)
}
