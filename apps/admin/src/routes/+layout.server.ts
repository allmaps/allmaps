import { env as publicEnv } from '$env/dynamic/public'

import { parseAdminPublicEnv } from '@allmaps/env/admin'

import type { LayoutServerLoad } from './$types'

const adminEnv = parseAdminPublicEnv(publicEnv)

export const load: LayoutServerLoad = () => {
  return {
    env: adminEnv
  }
}
