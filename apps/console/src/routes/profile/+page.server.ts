import { redirect } from '@sveltejs/kit'

import { getUserId } from '$lib/organizations.js'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getConsoleSession()
  const userId = session?.user?.id

  if (!userId) {
    redirect(302, '/')
  }

  redirect(302, `/users/${getUserId(userId)}`)
}
