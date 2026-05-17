import { apiEnvSchema } from './api.js'
import { authEnvSchema } from './auth.js'

export const authApiEnvSchema = apiEnvSchema.merge(authEnvSchema)
