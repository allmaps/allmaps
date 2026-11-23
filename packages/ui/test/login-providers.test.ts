import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchLoginProviders } from '../src/lib/auth/login-providers.ts'

const api = 'https://api.example.org/'
const returnTo = 'https://viewer.example.org/?map=1#details'
const signal = new AbortController().signal

test('discovers every advertised provider anonymously and preserves the return page', async () => {
  const providers = await fetchLoginProviders(
    api,
    returnTo,
    signal,
    async (url, init) => {
      assert.equal(String(url), api)
      assert.equal(init?.credentials, 'omit')
      assert.equal(init?.signal, signal)
      return Response.json({
        loginProviders: [
          { provider: 'google', url: '/login/google?locale=nl' },
          { provider: 'github', url: api + 'login/github' }
        ]
      })
    }
  )
  assert.deepEqual(
    providers.map(({ provider }) => provider),
    ['google', 'github']
  )
  assert.equal(new URL(providers[0].url).searchParams.get('locale'), 'nl')
  for (const { url } of providers)
    assert.equal(new URL(url).searchParams.get('returnTo'), returnTo)
})

test('honors an empty provider list and uses the legacy login URL only when the list is missing', async () => {
  const login = api + 'login/github'
  assert.deepEqual(
    await fetchLoginProviders(api, returnTo, signal, async () =>
      Response.json({ login, loginProviders: [] })
    ),
    []
  )
  const legacy = await fetchLoginProviders(api, returnTo, signal, async () =>
    Response.json({ login })
  )
  assert.equal(legacy[0].provider, 'github')
  assert.equal(new URL(legacy[0].url).pathname, '/login/github')
})

test('reports an unavailable API separately from an empty provider list', async () => {
  await assert.rejects(
    fetchLoginProviders(
      api,
      returnTo,
      signal,
      async () => new Response(null, { status: 503 })
    ),
    /Could not load login methods/
  )
})
