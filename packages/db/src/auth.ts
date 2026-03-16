import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { generateRandomId } from '@allmaps/id/sync'

import { anonymous, openAPI, admin, organization } from 'better-auth/plugins'

import { getNeonHttpDb } from './db.js'
import * as authSchema from './schema/auth.js'
import { lists as listsSchema } from './schema/lists.js'

export const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:5499'
const isProduction = baseURL.startsWith('https://')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL')
}

const db = getNeonHttpDb(databaseUrl, !isProduction)

export const auth = betterAuth({
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
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
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
