import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { parseRestEnv } from '@allmaps/env/rest'
import { parseBetterAuthEnv } from '@allmaps/env/better-auth'
import { createAuth } from '@allmaps/db/auth'
import {
  createElysia,
  createBetterAuthRoutes,
  handleApiError,
  getLoginProviders
} from '@allmaps/api-shared/elysia'
import { createApp } from '@allmaps/api-rest'
import { eq } from 'drizzle-orm'
import { users, accounts, sessions } from '@allmaps/db/schema/auth'
import { lists } from '@allmaps/db/schema/lists'
import { createTestContext, type TestContext } from './helpers/context.ts'

describe('Google authentication', () => {
  let context: TestContext

  beforeAll(async () => {
    context = await createTestContext()
  })

  afterAll(async () => {
    await context?.close()
  })

  function configuration(overrides: Record<string, string | undefined> = {}) {
    const env = parseRestEnv({
      ...context.env,
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      ...overrides
    })
    const betterAuth = createAuth(env, context.db)
    const routes = createElysia()
      .onError(handleApiError)
      .use(createBetterAuthRoutes(betterAuth))
      .compile()
    return { env, betterAuth, routes }
  }

  const googleCredentials = {
    GOOGLE_CLIENT_ID: 'google-test-client',
    GOOGLE_CLIENT_SECRET: 'google-test-secret'
  }

  async function googleCallback(
    email: string,
    emailVerified = true,
    authConfiguration = configuration(googleCredentials)
  ) {
    const { env, betterAuth, routes } = authConfiguration
    const returnTo = 'https://console.allmaps.org/lists'
    const signIn = await routes.handle(
      new Request(
        `${env.BETTER_AUTH_URL}/login/google?returnTo=${encodeURIComponent(returnTo)}`
      )
    )
    const state = new URL(signIn.headers.get('Location')!).searchParams.get(
      'state'
    )!
    const cookies = signIn.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')
    const payload = {
      sub: `google-${email}`,
      email,
      email_verified: emailVerified,
      name: 'Google display name',
      aud: googleCredentials.GOOGLE_CLIENT_ID,
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600
    }
    const idToken =
      [{ alg: 'RS256', typ: 'JWT' }, payload]
        .map((value) =>
          Buffer.from(JSON.stringify(value)).toString('base64url')
        )
        .join('.') + '.test-signature'
    // Only the provider token exchange is mocked; callback/state/DB logic is real.
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        expect(String(input)).toBe('https://oauth2.googleapis.com/token')
        return Response.json({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: idToken
        })
      })
    try {
      const callback = new URL(`${env.BETTER_AUTH_URL}/auth/callback/google`)
      callback.searchParams.set('state', state)
      callback.searchParams.set('code', 'test-authorization-code')
      return await betterAuth.auth.handler(
        new Request(callback, { headers: { Cookie: cookies } })
      )
    } finally {
      fetch.mockRestore()
    }
  }

  it('signs in with GitHub, signs out, then signs in to the same user with Google', async () => {
    const email = 'github-then-google@example.com'
    const authConfiguration = configuration({
      ...googleCredentials,
      GITHUB_CLIENT_ID: 'github-test-client',
      GITHUB_CLIENT_SECRET: 'github-test-secret'
    })
    const { env, betterAuth, routes } = authConfiguration
    const returnTo = 'https://console.allmaps.org/lists'
    const cookieHeaders = (response: Response) =>
      new Headers({
        Cookie: response.headers
          .getSetCookie()
          .map((cookie) => cookie.split(';')[0])
          .join('; ')
      })

    const signIn = await routes.handle(
      new Request(
        `${env.BETTER_AUTH_URL}/login/github?returnTo=${encodeURIComponent(returnTo)}`
      )
    )
    expect(signIn.status).toBe(302)
    const authorizationURL = new URL(signIn.headers.get('Location')!)
    expect(authorizationURL.origin).toBe('https://github.com')
    const callbackURL = new URL(`${env.BETTER_AUTH_URL}/auth/callback/github`)
    callbackURL.searchParams.set(
      'state',
      authorizationURL.searchParams.get('state')!
    )
    callbackURL.searchParams.set('code', 'github-authorization-code')

    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        switch (String(input)) {
          case 'https://github.com/login/oauth/access_token':
            return Response.json({
              access_token: 'github-access-token',
              token_type: 'Bearer',
              scope: 'read:user,user:email'
            })
          case 'https://api.github.com/user':
            return Response.json({
              id: 123456,
              login: 'github-original-name',
              name: 'Original GitHub profile',
              email,
              avatar_url: 'https://avatars.githubusercontent.com/u/123456'
            })
          case 'https://api.github.com/user/emails':
            return Response.json([{ email, primary: true, verified: true }])
          default:
            throw new Error(`Unexpected provider request: ${String(input)}`)
        }
      })
    let githubResponse: Response
    try {
      githubResponse = await betterAuth.auth.handler(
        new Request(callbackURL, { headers: cookieHeaders(signIn) })
      )
    } finally {
      fetch.mockRestore()
    }
    expect(githubResponse.status).toBe(302)
    expect(githubResponse.headers.get('Location')).toBe(returnTo)
    const githubHeaders = cookieHeaders(githubResponse)
    const githubSession = await betterAuth.auth.api.getSession({
      headers: githubHeaders,
      query: { disableCookieCache: true }
    })
    expect(githubSession).not.toBeNull()
    const userId = githubSession!.user.id
    expect(githubSession!.user).toMatchObject({
      email,
      emailVerified: true,
      slug: 'github-original-name',
      name: 'Original GitHub profile'
    })
    await context.db.insert(lists).values({
      id: 'github-before-google-list',
      userId,
      name: 'Created before Google login'
    })
    const originalLists = await context.db
      .select()
      .from(lists)
      .where(eq(lists.userId, userId))
    expect(originalLists).toHaveLength(2)

    const signOut = await routes.handle(
      new Request(`${env.BETTER_AUTH_URL}/logout`, { headers: githubHeaders })
    )
    expect(signOut.status).toBe(302)
    expect(signOut.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect(
      await betterAuth.auth.api.getSession({
        headers: githubHeaders,
        query: { disableCookieCache: true }
      })
    ).toBeNull()
    expect(
      await context.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId))
    ).toHaveLength(0)

    // Start a fresh OAuth flow without the old GitHub session cookie.
    const googleResponse = await googleCallback(email, true, authConfiguration)
    expect(googleResponse.status).toBe(302)
    expect(googleResponse.headers.get('Location')).toBe(returnTo)
    const googleSession = await betterAuth.auth.api.getSession({
      headers: cookieHeaders(googleResponse),
      query: { disableCookieCache: true }
    })
    expect(googleSession).not.toBeNull()
    expect(googleSession!.user).toMatchObject({
      id: userId,
      email,
      slug: 'github-original-name',
      name: 'Original GitHub profile'
    })
    expect(googleSession!.session.id).not.toBe(githubSession!.session.id)
    const matchingUsers = await context.db
      .select()
      .from(users)
      .where(eq(users.email, email))
    expect(matchingUsers).toHaveLength(1)
    const linkedAccounts = await context.db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
    expect(linkedAccounts.map((account) => account.providerId).sort()).toEqual([
      'github',
      'google'
    ])
    const currentLists = await context.db
      .select()
      .from(lists)
      .where(eq(lists.userId, userId))
    expect(currentLists).toHaveLength(originalLists.length)
    expect(currentLists).toEqual(expect.arrayContaining(originalLists))
  })

  it('creates a Google user and Starred list, retaining the username on later logins', async () => {
    const email = 'new-google@example.com'
    const response = await googleCallback(email)
    expect(response.headers.get('Location')).toBe(
      'https://console.allmaps.org/lists'
    )
    const [first] = await context.db
      .select()
      .from(users)
      .where(eq(users.email, email))
    expect(first.slug).toMatch(/^user-[a-f0-9]{32}$/)
    expect(first.emailVerified).toBe(true)
    const userLists = await context.db
      .select()
      .from(lists)
      .where(eq(lists.userId, first.id))
    expect(userLists).toHaveLength(1)
    expect(userLists[0]).toMatchObject({ name: 'Starred', deletable: false })
    await googleCallback(email)
    const [returning] = await context.db
      .select()
      .from(users)
      .where(eq(users.email, email))
    expect(returning.id).toBe(first.id)
    expect(returning.slug).toBe(first.slug)
  })

  it.each([true, false])(
    'only links to an existing verified local account (verified=%s)',
    async (verified) => {
      const id = `existing-${verified}`
      const email = `${id}@example.com`
      await context.db.insert(users).values({
        id,
        email,
        fullName: 'Existing GitHub user',
        emailVerified: verified,
        slug: id
      })
      await context.db.insert(accounts).values({
        id: `github-${id}`,
        accountId: id,
        providerId: 'github',
        userId: id
      })
      const response = await googleCallback(email)
      const linked = await context.db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, id))
      if (verified) {
        expect(response.headers.get('Location')).toBe(
          'https://console.allmaps.org/lists'
        )
        expect(linked.map((account) => account.providerId).sort()).toEqual([
          'github',
          'google'
        ])
      } else {
        expect(response.headers.get('Location')).toContain('account_not_linked')
        expect(linked).toHaveLength(1)
      }
      const [user] = await context.db
        .select()
        .from(users)
        .where(eq(users.id, id))
      expect(user.slug).toBe(id)
      expect(user.fullName).toBe('Existing GitHub user')
    }
  )

  it.each([{}, { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' }])(
    'accepts optional Google credentials %j',
    (overrides) => {
      const { betterAuth } = configuration(overrides)
      expect(betterAuth.auth.options.socialProviders.google).toBeUndefined()
    }
  )

  it.each([{ GOOGLE_CLIENT_ID: 'client' }, { GOOGLE_CLIENT_SECRET: 'secret' }])(
    'rejects incomplete Google credentials %j',
    (overrides) => {
      const env = { ...context.env, ...overrides }
      for (const parse of [parseRestEnv, parseBetterAuthEnv]) {
        expect(() => parse(env)).toThrow(
          'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
        )
      }
    }
  )

  it('supports both providers independently', () => {
    const { env, betterAuth } = configuration({
      ...googleCredentials,
      GITHUB_CLIENT_ID: 'github-test-client',
      GITHUB_CLIENT_SECRET: 'github-test-secret'
    })
    expect(getLoginProviders(betterAuth, env.PUBLIC_REST_BASE_URL)).toEqual([
      { provider: 'github', url: `${env.PUBLIC_REST_BASE_URL}/login/github` },
      { provider: 'google', url: `${env.PUBLIC_REST_BASE_URL}/login/google` }
    ])
  })

  it('advertises Google without requiring GitHub', async () => {
    const { env, betterAuth } = configuration(googleCredentials)
    const rest = createElysia<typeof env>()
      .decorate('env', env)
      .decorate('db', context.db)
      .use(createApp(env, betterAuth))
      .compile()
    const response = await rest.handle(new Request(env.PUBLIC_REST_BASE_URL))
    expect(response.status).toBe(200)
    const metadata = await response.json()
    expect(metadata).not.toHaveProperty('login')
    expect(metadata.loginProviders).toEqual([
      { provider: 'google', url: `${env.PUBLIC_REST_BASE_URL}/login/google` }
    ])
  })

  it('does not expose a disabled provider or accept unknown providers', async () => {
    const { env, routes } = configuration()
    const disabled = await routes.handle(
      new Request(`${env.BETTER_AUTH_URL}/login/google`)
    )
    expect(disabled.status).toBe(404)
    expect(await disabled.json()).toMatchObject({
      error: 'Google login is not configured'
    })
    const unknown = await routes.handle(
      new Request(`${env.BETTER_AUTH_URL}/login/unknown`)
    )
    expect(unknown.status).toBe(422)
  })

  it('initiates Google OAuth with PKCE, state and the configured callback', async () => {
    const { env, routes } = configuration(googleCredentials)
    const response = await routes.handle(
      new Request(
        `${env.BETTER_AUTH_URL}/login/google?returnTo=${encodeURIComponent('https://console.allmaps.org/lists')}`
      )
    )
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('Location')!)
    expect(location.origin).toBe('https://accounts.google.com')
    expect(location.searchParams.get('client_id')).toBe(
      googleCredentials.GOOGLE_CLIENT_ID
    )
    expect(location.searchParams.get('redirect_uri')).toBe(
      `${env.BETTER_AUTH_URL}/auth/callback/google`
    )
    expect(location.searchParams.get('state')).toBeTruthy()
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })

  it('rejects untrusted return URLs', async () => {
    const { env, routes } = configuration(googleCredentials)
    const response = await routes.handle(
      new Request(
        `${env.BETTER_AUTH_URL}/login/google?returnTo=https://untrusted.example/`
      )
    )
    expect(response.status).toBe(403)
    expect(response.headers.get('Location')).toBeNull()
  })

  it('keeps all OAuth cookies and forwards the return URL', async () => {
    const { env, betterAuth, routes } = configuration(googleCredentials)
    const headers = new Headers()
    headers.append('Set-Cookie', 'state=one; Path=/; HttpOnly')
    headers.append('Set-Cookie', 'verifier=two; Path=/; HttpOnly')
    const handler = vi
      .spyOn(betterAuth.auth, 'handler')
      .mockResolvedValueOnce(
        Response.json(
          { url: 'https://accounts.google.com/authorize' },
          { headers }
        )
      )
    const response = await routes.handle(
      new Request(`${env.BETTER_AUTH_URL}/login/google?returnTo=%2Flists`)
    )
    expect(await handler.mock.calls[0][0].json()).toMatchObject({
      provider: 'google',
      callbackURL: '/lists'
    })
    expect(response.headers.getSetCookie()).toEqual(headers.getSetCookie())
    handler.mockRestore()
  })

  it('generates valid opaque usernames without using names or email addresses', async () => {
    const { betterAuth } = configuration(googleCredentials)
    const mapProfile =
      betterAuth.auth.options.socialProviders.google!.mapProfileToUser
    const first = await mapProfile()
    const second = await mapProfile()
    expect(first.slug).toMatch(/^user-[a-f0-9]{32}$/)
    expect(second.slug).not.toBe(first.slug)
    expect(first.slug).toMatch(/^[a-z](?:[a-z0-9-]*[a-z0-9])?$/)
  })

  it('does not link a provider that reports an unverified email', async () => {
    const email = 'unverified-provider@example.com'
    await context.db.insert(users).values({
      id: 'unverified-provider',
      email,
      fullName: 'Existing user',
      emailVerified: true,
      slug: 'unverified-provider'
    })
    const response = await googleCallback(email, false)
    expect(response.headers.get('Location')).toContain('account_not_linked')
    const linked = await context.db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, 'unverified-provider'))
    expect(linked).toHaveLength(0)
  })

  it('preserves auth error statuses and rejects missing authorization URLs', async () => {
    const { env, betterAuth, routes } = configuration(googleCredentials)
    const handler = vi.spyOn(betterAuth.auth, 'handler')
    try {
      handler.mockResolvedValueOnce(
        Response.json({ error: 'Rate limited' }, { status: 429 })
      )
      const failure = await routes.handle(
        new Request(`${env.BETTER_AUTH_URL}/login/google`)
      )
      expect(failure.status).toBe(429)
      handler.mockResolvedValueOnce(Response.json({}))
      const missingURL = await routes.handle(
        new Request(`${env.BETTER_AUTH_URL}/login/google`)
      )
      expect(missingURL.status).toBe(502)
    } finally {
      handler.mockRestore()
    }
  })
})
