import { z } from 'zod'

import { baseEnvSchema, urlsEnvSchema } from '../fragments.js'
import { envBoolean } from '../shared.js'

export const workerEnvSchema = baseEnvSchema.merge(urlsEnvSchema).merge(
  z.object({
    USE_CACHE: envBoolean,
    BROWSER_CACHE_HOURS: z.coerce.number().int().nonnegative(),
    CLOUDFLARE_CACHE_HOURS: z.coerce.number().int().nonnegative()
  })
)
