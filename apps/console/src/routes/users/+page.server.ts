import { restFetch } from '$lib/server/rest.js'

import type { ConsoleUser } from './users.remote.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return {
    users: await restFetch<ConsoleUser[]>('/users?limit=10000')
  }
}
