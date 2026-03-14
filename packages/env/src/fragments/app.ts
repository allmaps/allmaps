import { z } from 'zod'

import { baseEnvSchema, urlsEnvSchema } from '../fragments.js'
import { envBoolean } from '../shared.js'

export const appPublicEnvSchema = urlsEnvSchema.merge(
  z.object({
    PUBLIC_STATS_WEBSITE_ID: z.string(),
    PUBLIC_GEOCODE_EARTH_KEY: z.string(),
    PUBLIC_BANNER_ENABLED: envBoolean,
    PUBLIC_BANNER_TEXT: z.string()
    // VITE_BANNER_ENABLED
    // VITE_BANNER_TEXT
  })
)

export const appEnvSchema = appPublicEnvSchema.merge(baseEnvSchema)
