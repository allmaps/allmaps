import { parseBetterAuthEnv } from '@allmaps/env'

import { createAuth } from './auth.js'
import { getPgContext } from './db.js'

const env = parseBetterAuthEnv(process.env)
const database = getPgContext(env.DATABASE_URL)
const { auth } = createAuth(env, database.db)

export { auth }
