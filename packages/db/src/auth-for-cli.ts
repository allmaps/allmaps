import { parseBetterAuthEnv } from '@allmaps/env'

import { createAuth } from './auth.js'

const { auth } = createAuth(parseBetterAuthEnv(process.env))

export { auth }
