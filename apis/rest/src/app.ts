import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'

import {
  createElysia,
  error,
  redirect,
  handleApiError
} from './elysia.js'

import { betterAuthPlugin } from './routes/auth.js'
import { manifests } from './routes/manifests.js'
import { images } from './routes/images.js'
import { maps } from './routes/maps.js'
import { lists } from './routes/lists.js'
import { organizations } from './routes/organizations.js'
import { projections } from './routes/projections.js'

import packageJson from '../package.json' with { type: 'json' }

export const app = createElysia({
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
  .use(maps)
  .use(manifests)
  .use(images)
  .use(lists)
  .use(organizations)
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
