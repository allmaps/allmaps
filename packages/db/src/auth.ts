import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import type { BetterAuthEnv } from '@allmaps/env'
import { generateRandomId } from '@allmaps/id/sync'

import { anonymous, openAPI, admin, organization } from 'better-auth/plugins'
import { adminAc, defaultAc, userAc } from 'better-auth/plugins/admin/access'
import {
  adminAc as organizationOwnerAc,
  memberAc
} from 'better-auth/plugins/organization/access'

import { getNeonHttpDb } from './db.js'
import type { Db } from './db.js'
import * as authSchema from './schema/auth.js'
import { lists as listsSchema } from './schema/lists.js'

export function createAuth(env: BetterAuthEnv, database?: Db) {
  const baseURL = env.BETTER_AUTH_URL

  const hostname = new URL(baseURL).hostname
  const isLocalhost = hostname === 'localhost'
  const useAllmapsCookieDomain = hostname.endsWith('.allmaps.org')

  const db = database ?? getNeonHttpDb(env.DATABASE_URL, isLocalhost)

  const auth = betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/auth',
    // Organization writes use the REST API's shared authorization and validation.
    disabledPaths: [
      '/admin/set-role',
      '/organization/create',
      '/organization/update',
      '/organization/delete',
      '/organization/update-member-role',
      '/organization/remove-member',
      '/organization/leave',
      '/organization/invite-member',
      '/organization/cancel-invitation',
      '/organization/accept-invitation',
      '/organization/reject-invitation'
    ],
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
    socialProviders:
      env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
              mapProfileToUser: (profile) => ({
                slug: profile.login.toLowerCase()
              })
            }
          }
        : {},
    trustedOrigins: ['https://*.allmaps.org', 'http://localhost:*'],
    // experimental: { joins: true },
    plugins: [
      anonymous(),
      openAPI(),
      admin({
        roles: {
          user: userAc,
          collaborator: userAc,
          // Role writes use the REST policy; account deletion requires database cleanup.
          admin: defaultAc.newRole({
            ...adminAc.statements,
            user: adminAc.statements.user.filter(
              (action) => action !== 'set-role' && action !== 'delete'
            )
          })
        },
        adminRoles: ['admin']
      }),
      organization({
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
        creatorRole: 'owner',
        // Owners manage their organization; only Allmaps admins can delete it.
        roles: { owner: organizationOwnerAc, member: memberAc },
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
                input: false
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
