import { createAuthClient } from 'better-auth/svelte'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { env as publicEnv } from '$env/dynamic/public'

import { parseAdminPublicEnv } from '@allmaps/env/admin'

const adminEnv = parseAdminPublicEnv(publicEnv)

export const authClient = createAuthClient({
  baseURL: adminEnv.PUBLIC_REST_BASE_URL,
  basePath: '/auth',
  plugins: [adminClient(), organizationClient()]
})
