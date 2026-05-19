import { t } from 'elysia'

import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'

import { IIIF } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'
import { generateId } from '@allmaps/id'
import { setCacheControl } from '@allmaps/api-shared'

import {
  createElysia,
  error,
  redirect,
  handleApiError,
  createBetterAuthRoutes,
  createTagsSorter
} from './elysia.js'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createMapsRoutes } from './routes/maps.js'
import { createImagesRoutes } from './routes/images.js'
import { createCanvasesRoutes } from './routes/canvases.js'
import { createManifestsRoutes } from './routes/manifests.js'
import { createOrganizationsRoutes } from './routes/organizations.js'
import { createListsRoutes } from './routes/lists.js'

import packageJson from '../package.json' with { type: 'json' }

const openApiTags = [
  { name: 'API' },
  { name: 'Maps' },
  { name: 'Images' },
  { name: 'Canvases' },
  { name: 'Manifests' },
  { name: 'Organizations' },
  { name: 'Lists' },
  { name: 'Authentication' }
]
const tagsSorter = createTagsSorter(openApiTags)

export function createApp(env: AnnotationsEnv, betterAuth: BetterAuthContext) {
  return createElysia({ name: 'app' })
    .use(createBetterAuthRoutes(betterAuth))
    .decorate('error', error)
    .decorate('redirect', redirect)
    .onError(handleApiError)
    .use(cors())
    .use(
      openapi({
        provider: null,
        specPath: 'openapi.json',
        documentation: {
          info: {
            title: 'Allmaps Annotations API Documentation',
            description: 'API documentation for the Allmaps Annotations API',
            version: packageJson.version
          },
          tags: openApiTags
        },
        scalar: {
          tagsSorter,
          agent: {
            disabled: true
          }
        }
      })
    )
    .use(createMapsRoutes(env, betterAuth))
    .use(createImagesRoutes(env, betterAuth))
    .use(createCanvasesRoutes(env, betterAuth))
    .use(createManifestsRoutes(env, betterAuth))
    .use(createOrganizationsRoutes(env, betterAuth))
    .use(createListsRoutes(env, betterAuth))
    .get(
      '/',
      async ({ env, query, set }) => {
        if (query.url) {
          setCacheControl(set, 'public-medium')
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

        setCacheControl(set, 'public-short')
        return {
          name: 'Allmaps Annotations API',
          version: packageJson.version,
          docs: `${env.PUBLIC_ANNOTATIONS_BASE_URL}/docs`,
          login: `${env.PUBLIC_ANNOTATIONS_BASE_URL}/login/github`,
          logout: `${env.PUBLIC_ANNOTATIONS_BASE_URL}/logout`
        }
      },
      {
        query: t.Object({ url: t.Optional(t.String()) }),
        detail: { summary: 'Allmaps Annotations API', tags: ['API'] }
      }
    )
}
