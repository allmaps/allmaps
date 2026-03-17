import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'

import {
  createElysia,
  error,
  redirect,
  handleApiError
} from './elysia.js'

import type { BetterAuthContext } from '@allmaps/db'
import type { RestEnv } from '@allmaps/env/rest'

import { createBetterAuthRoutes } from './routes/auth.js'
import { manifests } from './routes/manifests.js'
import { images } from './routes/images.js'
import { createMaps } from './routes/maps.js'
import { createLists } from './routes/lists.js'
import { createOrganizations } from './routes/organizations.js'
import { projections } from './routes/projections.js'

import packageJson from '../package.json' with { type: 'json' }

export function createApp(env: RestEnv, betterAuth: BetterAuthContext) {
  const betterAuthPlugin = createBetterAuthRoutes(env, betterAuth)

  return createElysia({
    name: 'app'
  })
    .decorate('error', error)
    .decorate('redirect', redirect)
    .use(betterAuthPlugin)
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
    .onError(handleApiError)
    .use(createMaps(betterAuthPlugin))
    .use(manifests)
    .use(images)
    .use(createLists(betterAuthPlugin))
    .use(createOrganizations(betterAuthPlugin))
    .use(projections)
    .use(cors())
    .get(
      '/',
      () => {
        return {
          name: 'Allmaps API',
          version: packageJson.version,
          docs: '/docs',
          login: '/login/github',
          logout: '/logout'
        }
      },
      {
        detail: {
          summary: 'Allmaps API',
          tags: ['API']
        }
      }
    )
}
