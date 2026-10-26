import { createAuthClient } from 'better-auth/svelte'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { defaultRoles, userAc } from 'better-auth/plugins/admin/access'
import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

const consoleEnv = parseConsolePublicEnv(publicEnv)

export const authClient = createAuthClient({
  baseURL: consoleEnv.PUBLIC_REST_BASE_URL,
  basePath: '/auth',
  plugins: [
    adminClient({
      roles: { ...defaultRoles, collaborator: userAc }
    }),
    organizationClient()
  ]
})
