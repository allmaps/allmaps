import { z } from 'zod'

export const authEnvSchema = z
  .object({
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_COOKIE_PREFIX: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional()
  })
  .refine(
    (env) =>
      Boolean(env.GITHUB_CLIENT_ID) === Boolean(env.GITHUB_CLIENT_SECRET),
    {
      message:
        'Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or leave both empty',
      path: ['GITHUB_CLIENT_SECRET']
    }
  )
