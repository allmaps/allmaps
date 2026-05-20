import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'

import { setCacheControl } from '@allmaps/api-shared'

import {
  createElysia,
  error,
  redirect,
  handleApiError,
  createBetterAuthPlugin,
  createBetterAuthRoutes as createSharedBetterAuthRoutes,
  createTagsSorter
} from './elysia.js'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

import { createAuthRoutes } from './routes/auth.js'
import { createManifestsRoutes } from './routes/manifests.js'
import { createCanvasesRoutes } from './routes/canvases.js'
import { createImagesRoutes } from './routes/images.js'
import { createMapsRoutes } from './routes/maps.js'
import { createListsRoutes } from './routes/lists.js'
import { createOrganizationsRoutes } from './routes/organizations.js'
import { projections } from './routes/projections.js'

import packageJson from '../package.json' with { type: 'json' }

const openApiTags = [
  { name: 'API' },
  { name: 'Maps' },
  { name: 'Images' },
  { name: 'Canvases' },
  { name: 'Manifests' },
  { name: 'Organizations' },
  { name: 'Lists' },
  { name: 'Projections' },
  { name: 'Authentication' }
]
const tagsSorter = createTagsSorter(openApiTags)

export function createApp(env: RestEnv, betterAuth: BetterAuthContext) {
  const betterAuthPlugin = createBetterAuthPlugin(betterAuth)
  return createElysia({
    name: 'app'
  })
    .use(betterAuthPlugin)
    .derive(({ request }) => ({
      getOptionalSession: () =>
        betterAuth.auth.api.getSession({ headers: request.headers })
    }))
    .decorate('error', error)
    .decorate('redirect', redirect)
    .onError(handleApiError)
    .use(cors())
    .use(
      openapi({
        path: 'docs',
        specPath: 'openapi.json',
        documentation: {
          info: {
            title: 'Allmaps API Documentation',
            description: 'API documentation for the Allmaps REST API',
            version: packageJson.version
          },
          components: {
            securitySchemes: {
              sessionCookie: {
                type: 'apiKey',
                in: 'cookie',
                name: 'better-auth.session_token',
                description:
                  'Better Auth session cookie. Some routes additionally require the authenticated user to be an admin.'
              }
            }
          },
          tags: openApiTags
        },
        exclude: {
          staticFile: false
        },
        scalar: {
          tagsSorter,
          agent: {
            disabled: true
          }
        }
      })
    )
    .use(createSharedBetterAuthRoutes(betterAuth))
    .use(createAuthRoutes(env, betterAuth))
    .use(createMapsRoutes(betterAuth))
    .use(createListsRoutes(betterAuth))
    .use(createOrganizationsRoutes(env, betterAuth))
    .use(createManifestsRoutes(env, betterAuth))
    .use(createCanvasesRoutes(env, betterAuth))
    .use(createImagesRoutes(env, betterAuth))
    .use(projections)
    .get(
      '/',
      async ({ env, getOptionalSession, set }) => {
        const session = await getOptionalSession()
        setCacheControl(set, session ? 'private-no-store' : 'public-short')

        let user

        if (session && session.user) {
          user = {
            id: `${env.PUBLIC_REST_BASE_URL}/users/${session.user.id}`,
            name: session.user.name,
            email: session.user.email,
            slug: session.user.slug
          }
        }

        return {
          name: 'Allmaps REST API',
          version: packageJson.version,
          docs: `${env.PUBLIC_REST_BASE_URL}/docs`,
          login: session
            ? undefined
            : `${env.PUBLIC_REST_BASE_URL}/login/github`,
          logout: session ? `${env.PUBLIC_REST_BASE_URL}/logout` : undefined,
          user
        }
      },
      {
        detail: {
          summary: 'Allmaps REST API',
          tags: ['API']
        }
      }
    )
}
