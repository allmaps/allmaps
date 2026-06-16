import { restFetch } from '$lib/server/rest.js'
import { CONSOLE_LIST_LIMIT } from '$lib/limits.js'

import type { ConsoleUser } from './users.remote.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return {
    users: await restFetch<ConsoleUser[]>(`/users?limit=${CONSOLE_LIST_LIMIT}`)
  }
}
