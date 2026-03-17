import { t } from 'elysia'

import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'

import { IIIF } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'
import { generateId } from '@allmaps/id'

import { createElysia, createBetterAuthPlugin } from './elysia.js'

import { maps } from './routes/maps.js'
import { images } from './routes/images.js'
import { canvases } from './routes/canvases.js'
import { manifests } from './routes/manifests.js'
import { lists } from './routes/lists.js'

import packageJson from '../package.json' with { type: 'json' }

export const app = createElysia({ name: 'app' })
  .use(createBetterAuthPlugin())
  .use(
    openapi({
      path: 'docs',
      documentation: {
        info: {
          title: 'Allmaps Annotations API Documentation',
          description: 'API documentation for the Allmaps Annotations API',
          version: packageJson.version
        }
      }
    })
  )
  .use(cors())
  .use(maps)
  .use(images)
  .use(canvases)
  .use(manifests)
  .use(lists)
  .get(
    '/',
    async ({ env, query, set }) => {
      if (query.url) {
        const iiifData = await fetchJson(query.url)
        const parsedIiif = IIIF.parse(iiifData)
        const id = await generateId(parsedIiif.uri)

        let location: string
        if (parsedIiif.type === 'image') {
          location = `${env.PUBLIC_ANNOTATIONS_BASE_URL}/images/${id}`
        } else if (parsedIiif.type === 'manifest') {
          location = `${env.PUBLIC_ANNOTATIONS_BASE_URL}/manifests/${id}`
        } else {
          set.status = 400
          return { error: `Unsupported IIIF type: ${parsedIiif.type}` }
        }

        set.status = 301
        set.headers['Location'] = location
        return
      }

      return {
        name: 'Allmaps Annotations API',
        version: packageJson.version,
        docs: '/docs',
        login: '/login/github',
        logout: '/logout'
      }
    },
    {
      query: t.Object({ url: t.Optional(t.String()) }),
      detail: { summary: 'Allmaps Annotations API', tags: ['API'] }
    }
  )
