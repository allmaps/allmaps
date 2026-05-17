import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

import type { LayoutServerLoad } from './$types'

const consoleEnv = parseConsolePublicEnv(publicEnv)

export const load: LayoutServerLoad = () => {
  return {
    env: consoleEnv
  }
}
