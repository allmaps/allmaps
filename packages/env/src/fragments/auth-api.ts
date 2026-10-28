import { z } from 'zod'

import { apiEnvSchema } from './api.js'
import { authEnvSchema } from './auth.js'

export const authApiEnvSchema = apiEnvSchema
  .extend({
    PUBLIC_DOCS_BASE_URL: z.string().url().default('https://docs.allmaps.org'),
    PUBLIC_HOMEPAGE_BASE_URL: z.string().url().default('https://allmaps.org')
  })
  .and(authEnvSchema)
