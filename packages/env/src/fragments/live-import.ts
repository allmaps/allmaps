import { z } from 'zod'

export const liveImportEnvSchema = z.object({
  // Empty or absent disables HTTP imports without disabling WebSocket editing.
  LIVE_IMPORT_SECRET: z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), z.string().min(32)]))
    .optional()
})
