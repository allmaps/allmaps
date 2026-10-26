import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseRestEnv } from '@allmaps/env/rest'
import { parseBetterAuthEnv } from '@allmaps/env/better-auth'
import { createAuth } from '@allmaps/db/auth'
import { createElysia } from '@allmaps/api-shared/elysia'
import { createApp } from '@allmaps/api-rest'
import { apiEnvironment } from '@allmaps/tools-apis'
import { createTestEnvironment } from './helpers/environment.ts'
import { createTestContext, type TestContext } from './helpers/context.ts'

it.each([{}, { GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '' }])(
  'accepts optional GitHub configuration %j',
  (github) => {
    const env = apiEnvironment(
      createTestEnvironment(github),
      'pglite',
      'auth-test'
    )
    expect(parseRestEnv(env)).toMatchObject(github)
    expect(parseBetterAuthEnv(env)).toMatchObject(github)
  }
)

it.each([{ GITHUB_CLIENT_ID: 'client' }, { GITHUB_CLIENT_SECRET: 'secret' }])(
  'rejects an incomplete credential pair %j',
  (github) => {
    const env = apiEnvironment(
      createTestEnvironment(github),
      'pglite',
      'auth-test'
    )
    expect(() => parseRestEnv(env)).toThrow(
      'Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET'
    )
    expect(() => parseBetterAuthEnv(env)).toThrow(
      'Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET'
    )
  }
)

describe('optional GitHub authentication with local PGlite', () => {
  let context: TestContext
  beforeAll(async () => {
    context = await createTestContext()
  })
  afterAll(async () => {
    await context?.close()
  })

  it('omits the provider and login link when GitHub is not configured', async () => {
    expect(
      context.betterAuth.auth.options.socialProviders.github
    ).toBeUndefined()
    const root = await context.rest.handle(
      new Request(`${context.env.PUBLIC_REST_BASE_URL}/`)
    )
    expect(root.status).toBe(200)
    expect(await root.json()).not.toHaveProperty('login')
    const login = await context.rest.handle(
      new Request(`${context.env.PUBLIC_REST_BASE_URL}/login/github`)
    )
    expect(login.status).toBe(404)
    expect(await login.json()).toMatchObject({
      error: 'GitHub login is not configured'
    })
  })

  it('retains GitHub provider configuration and the advertised login URL when both credentials are supplied', async () => {
    const env = parseRestEnv({
      ...context.env,
      GITHUB_CLIENT_ID: 'test-client',
      GITHUB_CLIENT_SECRET: 'test-secret'
    })
    const betterAuth = createAuth(env, context.db)
    expect(betterAuth.auth.options.socialProviders.github).toMatchObject({
      clientId: 'test-client',
      clientSecret: 'test-secret'
    })
    const rest = createElysia<typeof env>()
      .decorate('env', env)
      .decorate('db', context.db)
      .use(createApp(env, betterAuth))
      .compile()
    const response = await rest.handle(
      new Request(`${env.PUBLIC_REST_BASE_URL}/`)
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveProperty(
      'login',
      `${env.PUBLIC_REST_BASE_URL}/login/github`
    )
  })
})
