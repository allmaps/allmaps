import { z } from 'zod'

export const baseEnvSchema = z.object({
  NODE_VERSION: z.string()
})
