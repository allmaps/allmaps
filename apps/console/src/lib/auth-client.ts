import { createAllmapsAuthClient } from '@allmaps/ui/auth-client'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

const consoleEnv = parseConsolePublicEnv(publicEnv)

export const authClient = createAllmapsAuthClient(
  consoleEnv.PUBLIC_REST_BASE_URL,
  adminClient(),
  organizationClient()
)
