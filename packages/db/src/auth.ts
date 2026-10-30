import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import type { BetterAuthEnv } from '@allmaps/env'
import { generateRandomId } from '@allmaps/id/sync'

import { anonymous, openAPI, admin, organization } from 'better-auth/plugins'

import { getNeonHttpDb } from './db.js'
import type { Db } from './db.js'
import * as authSchema from './schema/auth.js'
import { lists as listsSchema } from './schema/lists.js'

type AuthSettings = Omit<BetterAuthEnv, 'DATABASE_URL'>

export function createAuth(
  env: AuthSettings,
  database: Db
): ReturnType<typeof buildAuth>
export function createAuth(env: BetterAuthEnv): ReturnType<typeof buildAuth>
export function createAuth(
  env: AuthSettings & { DATABASE_URL?: string },
  database?: Db
) {
  if (!database && !env.DATABASE_URL) {
    throw new Error(
      'Authentication requires an explicit database or DATABASE_URL'
    )
  }
  const db =
    database ??
    getNeonHttpDb(
      env.DATABASE_URL!,
      new URL(env.BETTER_AUTH_URL).hostname === 'localhost'
    )
  return buildAuth(env, db)
}

function buildAuth(env: AuthSettings, db: Db) {
  const baseURL = env.BETTER_AUTH_URL

  const hostname = new URL(baseURL).hostname
  const useAllmapsCookieDomain = hostname.endsWith('.allmaps.org')

  const auth = betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: authSchema,
      usePlural: true
    }),
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        // Require provider-verified emails instead of bypassing verification.
        trustedProviders: [],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false
      }
    },
    user: {
      fields: {
        name: 'fullName'
      },
      additionalFields: {
        slug: {
          type: 'string'
        }
      }
    },
    advanced: {
      cookiePrefix: env.BETTER_AUTH_COOKIE_PREFIX,
      crossSubDomainCookies: useAllmapsCookieDomain
        ? { enabled: true, domain: 'allmaps.org' }
        : { enabled: false },
      trustedOrigins: ['https://*.allmaps.org', 'http://localhost:*'],
      database: {
        generateId: (options) => {
          if (
            options.model === 'user' ||
            options.model === 'users' ||
            options.model === 'organization' ||
            options.model === 'organizations'
          ) {
            return generateRandomId()
          }

          // UUIDs for session, account, verification
          return crypto.randomUUID()
        }
      }
    },
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
              mapProfileToUser: (profile) => ({
                slug: profile.login.toLowerCase()
              })
            }
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              // Google has no username. Use an opaque, valid Allmaps slug.
              mapProfileToUser: () => ({
                slug: `user-${generateRandomId(32)}`
              })
            }
          }
        : {})
    },
    trustedOrigins: ['https://*.allmaps.org', 'http://localhost:*'],
    // experimental: { joins: true },
    plugins: [
      anonymous(),
      openAPI(),
      admin(),
      organization({
        allowUserToCreateOrganization: false,
        schema: {
          organization: {
            additionalFields: {
              homepage: {
                type: 'string',
                required: false,
                input: true
              },
              plan: {
                type: 'string',
                required: false,
                input: true
              },
              displayCollections: {
                type: 'boolean',
                required: false,
                input: true
              },
              location: {
                type: 'json',
                required: false,
                input: true
              }
            }
          }
        }
      })
    ],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60 // Cache for 5 minutes
      }
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db.insert(listsSchema).values({
              id: generateRandomId(),
              userId: user.id,
              name: 'Starred',
              deletable: false
            })
          }
        }
      }
    }
  })

  return { auth, baseURL }
}

export type BetterAuthContext = ReturnType<typeof createAuth>
