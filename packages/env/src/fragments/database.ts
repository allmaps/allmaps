import { z } from 'zod'

import { envBoolean } from '../shared.js'

export const databaseEnvSchema = z.object({
  // PGHOST: z.string().min(1),
  // PGDATABASE: z.string().min(1),
  // PGUSER: z.string().min(1),
  // PGPASSWORD: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url(),
  LOG_QUERIES: envBoolean
})
