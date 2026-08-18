import { env as publicEnv } from '$env/dynamic/public'

import { parseConsolePublicEnv } from '@allmaps/env/console'

export const consoleEnv = parseConsolePublicEnv(publicEnv)
