import type { LayoutLoad } from './$types'

import { authClient } from '$lib/auth-client.js'

export const load: LayoutLoad = ({ data }) => {
  return {
    ...data,
    sessionData: authClient.getSession()
  }
}
