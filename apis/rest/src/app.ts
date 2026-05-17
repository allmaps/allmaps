import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'

import {
  createElysia,
  error,
  redirect,
  handleApiError,
  createBetterAuthPlugin
} from './elysia.js'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

import { createBetterAuthRoutes } from './routes/auth.js'
import { manifests } from './routes/manifests.js'
import { canvases } from './routes/canvases.js'
import { images } from './routes/images.js'
import { createMapsRoutes } from './routes/maps.js'
import { createListsRoutes } from './routes/lists.js'
import { createOrganizationsRoutes } from './routes/organizations.js'
import { projections } from './routes/projections.js'

import packageJson from '../package.json' with { type: 'json' }

export function createApp(env: RestEnv, betterAuth: BetterAuthContext) {
  const betterAuthPlugin = createBetterAuthPlugin(betterAuth)

  return createElysia({
    name: 'app'
  })
    .decorate('error', error)
    .decorate('redirect', redirect)
    .onError(handleApiError)
    .use(cors())
    .use(
      openapi({
        path: 'docs',
        documentation: {
          info: {
            title: 'Allmaps API Documentation',
            description: 'API documentation for the Allmaps REST API',
            version: packageJson.version
          }
        }
      })
    )
    .use(createBetterAuthRoutes(env, betterAuthPlugin, betterAuth))
    .use(createMapsRoutes(betterAuthPlugin))
    .use(manifests)
    .use(canvases)
    .use(images)
    .use(createListsRoutes(betterAuthPlugin))
    .use(createOrganizationsRoutes(env, betterAuthPlugin, betterAuth))
    .use(projections)
    .get(
      '/',
      () => ({
        name: 'Allmaps REST API',
        version: packageJson.version,
        docs: '/docs',
        login: '/login/github',
        logout: '/logout'
      }),
      {
        detail: {
          summary: 'Allmaps REST API',
          tags: ['API']
        }
      }
    )
}
