import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createElysia } from '@allmaps/api-shared/elysia'

import { createApp as createRestApp } from '../../../apis/rest/src/app.ts'
import { createApp as createAnnotationsApp } from '../../../apis/annotations/src/app.ts'
import { nodeAdapter } from '../../../tools/apis/src/node-adapter.ts'
import { createTestContext, type TestContext } from './helpers/context.ts'

describe('API references hosted on the docs site', () => {
  let context: TestContext
  let references: Array<{
    name: string
    baseUrl: string
    handle: (request: Request) => Promise<Response>
  }>

  beforeAll(async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('OpenAPI tests must not make network requests')
    })
    context = await createTestContext()
    const { db, env, betterAuth } = context
    // Import the API sources so these checks cannot pass against stale dist files.
    references = [
      {
        name: 'REST',
        baseUrl: env.PUBLIC_REST_BASE_URL,
        handle: createElysia({ adapter: nodeAdapter() })
          .decorate('env', env)
          .decorate('db', db)
          .use(createRestApp(env, betterAuth)).handle
      },
      {
        name: 'Annotations',
        baseUrl: env.PUBLIC_ANNOTATIONS_BASE_URL,
        handle: createElysia({ adapter: nodeAdapter() })
          .decorate('env', env)
          .decorate('db', db)
          .use(createAnnotationsApp(env, betterAuth)).handle
      }
    ]
  })

  afterAll(async () => {
    try {
      await context?.close()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each(['REST', 'Annotations'])(
    'serves the %s spec with its own server URL and cross-origin access',
    async (name) => {
      const reference = references.find((reference) => reference.name === name)!
      const response = await reference.handle(
        new Request(`${reference.baseUrl}/openapi.json`, {
          headers: { Origin: 'https://dev.docs.allmaps.org' }
        })
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://dev.docs.allmaps.org'
      )
      const spec = await response.json()
      expect(spec.servers).toEqual([{ url: reference.baseUrl }])
      expect(spec.info.termsOfService).toBe(
        'https://allmaps.org/terms#hosted-allmaps-services'
      )
      expect(spec.paths['/maps']).toBeDefined()

      if (name === 'REST') {
        const operation = spec.paths['/lists/{listId}/items'].delete
        const query = operation.parameters.filter(
          (parameter: { in: string }) => parameter.in === 'query'
        )
        expect(
          query.map((parameter: { name: string }) => parameter.name).sort()
        ).toEqual(['canvasId', 'imageId', 'manifestId', 'mapId'])
        for (const parameter of query) {
          expect(parameter.required).not.toBe(true)
          expect(parameter.schema.type).toBe('string')
        }
        expect(operation.security).toEqual([{ sessionCookie: [] }])
      }
    }
  )

  it.each(['REST', 'Annotations'])(
    'links the %s root to the docs site and removes the embedded docs page',
    async (name) => {
      const reference = references.find((reference) => reference.name === name)!
      const response = await reference.handle(new Request(reference.baseUrl))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        docs: 'https://docs.allmaps.org/api',
        terms: 'https://allmaps.org/terms#hosted-allmaps-services'
      })
      const oldDocs = await reference.handle(
        new Request(`${reference.baseUrl}/docs`)
      )
      expect(oldDocs.status).toBe(404)
    }
  )
})
