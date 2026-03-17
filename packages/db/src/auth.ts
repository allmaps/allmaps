import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import type { BetterAuthEnv } from '@allmaps/env'
import { generateRandomId } from '@allmaps/id/sync'

import { anonymous, openAPI, admin, organization } from 'better-auth/plugins'

import { getNeonHttpDb } from './db.js'
import * as authSchema from './schema/auth.js'
import { lists as listsSchema } from './schema/lists.js'

export function createAuth(env: BetterAuthEnv) {
  const baseURL = env.BETTER_AUTH_URL
  const isProduction = baseURL.startsWith('https://')
  const db = getNeonHttpDb(env.DATABASE_URL, !isProduction)

  const auth = betterAuth({
    baseURL,
    basePath: '/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: authSchema,
      usePlural: true
    }),
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
      crossSubDomainCookies: isProduction
        ? { enabled: true, domain: '.allmaps.org' }
        : { enabled: false },
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
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: (profile) => ({
          slug: profile.login
        })
      }
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
