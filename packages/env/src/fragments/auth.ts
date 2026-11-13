import { z } from 'zod'

export const authEnvSchema = z
  .object({
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_COOKIE_PREFIX: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    OAUTH_PROXY_ENABLED: z.enum(['true', 'false']).optional(),
    OAUTH_PROXY_URL: z.string().url().optional(),
    OAUTH_PROXY_SECRET: z.string().optional(),
    OAUTH_PROXY_ALLOWED_ORIGINS: z.string().optional()
  })
  .refine(
    (env) =>
      Boolean(env.GITHUB_CLIENT_ID) === Boolean(env.GITHUB_CLIENT_SECRET) ||
      (env.OAUTH_PROXY_ENABLED === 'true' &&
        env.BETTER_AUTH_URL !== env.OAUTH_PROXY_URL &&
        Boolean(env.GITHUB_CLIENT_ID) &&
        !env.GITHUB_CLIENT_SECRET),
    {
      message:
        'Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or leave both empty',
      path: ['GITHUB_CLIENT_SECRET']
    }
  )
  .refine(
    (env) =>
      Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET) ||
      (env.OAUTH_PROXY_ENABLED === 'true' &&
        env.BETTER_AUTH_URL !== env.OAUTH_PROXY_URL &&
        Boolean(env.GOOGLE_CLIENT_ID) &&
        !env.GOOGLE_CLIENT_SECRET),
    {
      message:
        'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or leave both empty',
      path: ['GOOGLE_CLIENT_SECRET']
    }
  )
