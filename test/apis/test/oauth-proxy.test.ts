import { describe, it, expect, vi } from 'vitest'
import { createAuth, getOAuthProxyConfiguration } from '@allmaps/db/auth'
import { parseRestEnv } from '@allmaps/env/rest'
import { schema } from '@allmaps/db'
import { createTestContext } from './helpers/context.ts'

const coordinator = 'https://dev.api.allmaps.org'
const preview = 'https://api-preview.allmaps.org'
const consoleOrigin = 'https://console-preview.allmaps.org'
const sharedSecret = 'test-dedicated-oauth-proxy-secret-32-characters'
const settings = {
  BETTER_AUTH_URL: coordinator,
  BETTER_AUTH_COOKIE_PREFIX: 'allmaps-dev',
  BETTER_AUTH_SECRET: 'test-main-secret-separate-from-proxy',
  OAUTH_PROXY_ENABLED: 'true' as const,
  OAUTH_PROXY_URL: coordinator,
  OAUTH_PROXY_SECRET: sharedSecret,
  OAUTH_PROXY_ALLOWED_ORIGINS: `${preview},${consoleOrigin},https://dev.console.allmaps.org`
}

describe('development OAuth Proxy', () => {
  it('is opt-in and refuses production, wildcard origins, missing or shared main secrets', () => {
    expect(
      getOAuthProxyConfiguration({
        ...settings,
        OAUTH_PROXY_ENABLED: undefined,
        BETTER_AUTH_URL: 'https://api.allmaps.org',
        BETTER_AUTH_COOKIE_PREFIX: 'allmaps'
      })
    ).toBeUndefined()
    expect(
      getOAuthProxyConfiguration({ ...settings, OAUTH_PROXY_ENABLED: 'false' })
    ).toBeUndefined()
    for (const overrides of [
      { BETTER_AUTH_URL: 'https://api.allmaps.org' },
      { BETTER_AUTH_COOKIE_PREFIX: 'allmaps' },
      { BETTER_AUTH_URL: 'https://external.example' },
      { OAUTH_PROXY_URL: 'https://api.allmaps.org' },
      { OAUTH_PROXY_SECRET: undefined },
      { OAUTH_PROXY_SECRET: settings.BETTER_AUTH_SECRET },
      { OAUTH_PROXY_ALLOWED_ORIGINS: 'https://*.allmaps.org' },
      { OAUTH_PROXY_ALLOWED_ORIGINS: 'https://console.allmaps.org' },
      { OAUTH_PROXY_ALLOWED_ORIGINS: `${preview}/unexpected-path` },
      { BETTER_AUTH_URL: preview, OAUTH_PROXY_ALLOWED_ORIGINS: consoleOrigin }
    ])
      expect(() =>
        getOAuthProxyConfiguration({ ...settings, ...overrides })
      ).toThrow()
    expect(getOAuthProxyConfiguration(settings)?.productionURL).toBe(
      coordinator
    )
  })

  it('uses the develop provider callback while creating the session only in the preview database', async () => {
    const centralContext = await createTestContext()
    const previewContext = await createTestContext()
    try {
      const centralEnv = parseRestEnv({
        ...centralContext.env,
        ...settings,
        GITHUB_CLIENT_ID: 'proxy-test-client',
        GITHUB_CLIENT_SECRET: 'test-coordinator-provider-secret',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: ''
      })
      const previewEnv = parseRestEnv({
        ...previewContext.env,
        ...settings,
        BETTER_AUTH_URL: preview,
        BETTER_AUTH_COOKIE_PREFIX: 'allmaps-preview-test',
        BETTER_AUTH_SECRET:
          'test-preview-main-secret-separate-from-coordinator',
        GITHUB_CLIENT_ID: 'proxy-test-client',
        GITHUB_CLIENT_SECRET: '',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: ''
      })
      const centralAuth = createAuth(centralEnv, centralContext.db).auth
      const previewAuth = createAuth(previewEnv, previewContext.db).auth
      const productionAuth = createAuth(
        parseRestEnv({
          ...centralContext.env,
          BETTER_AUTH_URL: 'https://api.allmaps.org'
        }),
        centralContext.db
      ).auth
      expect(
        productionAuth.options.plugins?.some(
          (plugin) => plugin.id === 'oauth-proxy'
        )
      ).toBe(false)
      const signIn = await previewAuth.handler(
        new Request(`${preview}/auth/sign-in/social`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: consoleOrigin
          },
          body: JSON.stringify({
            provider: 'github',
            callbackURL: `${consoleOrigin}/statistics`
          })
        })
      )
      expect(signIn.status).toBe(200)
      const authorization = new URL((await signIn.json()).url)
      expect(authorization.searchParams.get('redirect_uri')).toBe(
        `${coordinator}/auth/callback/github`
      )
      const cookie = signIn.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ')
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (input) => {
          const url = String(input)
          if (url === 'https://github.com/login/oauth/access_token')
            return Response.json({
              access_token: 'test-provider-token',
              token_type: 'bearer',
              scope: 'user:email'
            })
          if (url === 'https://api.github.com/user')
            return Response.json({
              id: 123456,
              login: 'proxy-test-person',
              name: 'Proxy test person',
              email: 'proxy-test@example.test',
              avatar_url: ''
            })
          if (url === 'https://api.github.com/user/emails')
            return Response.json([
              {
                email: 'proxy-test@example.test',
                primary: true,
                verified: true
              }
            ])
          throw new Error('Unexpected provider network call')
        })
      try {
        const callback = new URL(`${coordinator}/auth/callback/github`)
        callback.searchParams.set(
          'state',
          authorization.searchParams.get('state')!
        )
        callback.searchParams.set('code', 'test-provider-code')
        const centralResponse = await centralAuth.handler(
          new Request(callback, { headers: { Cookie: cookie } })
        )
        expect(centralResponse.status).toBe(302)
        const location = centralResponse.headers.get('Location')!
        expect(new URL(location).origin).toBe(preview)
        expect(
          await centralContext.db.select().from(schema.users)
        ).toHaveLength(0)
        const completed = await previewAuth.handler(
          new Request(location, { headers: { Cookie: cookie } })
        )
        expect(completed.status).toBe(302)
        expect(completed.headers.get('Location')).toBe(
          `${consoleOrigin}/statistics`
        )
        expect(
          await previewContext.db.select().from(schema.users)
        ).toHaveLength(1)
        expect(
          await previewContext.db.select().from(schema.sessions)
        ).toHaveLength(1)
        expect(
          await centralContext.db.select().from(schema.sessions)
        ).toHaveLength(0)
        expect(
          completed.headers
            .getSetCookie()
            .some((value) =>
              value.includes('allmaps-preview-test.session_token=')
            )
        ).toBe(true)
      } finally {
        fetch.mockRestore()
      }
    } finally {
      await previewContext.close()
      await centralContext.close()
    }
  }, 60000)
})
