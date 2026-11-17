import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchPartnerOrganization } from '../src/lib/organization.ts'

test('resolves a partner by its exact slug and uses its API name', async () => {
  for (const plan of ['innovator', 'supporter']) {
    const organization = await fetchPartnerOrganization(
      async (input) => {
        assert.equal(
          String(input),
          'https://api.example.org/organizations?slug=nypl'
        )
        return Response.json([
          { slug: 'nypl', name: 'New York Public Library', plan }
        ])
      },
      'https://api.example.org/',
      'nypl'
    )
    assert.deepEqual(organization, {
      slug: 'nypl',
      name: 'New York Public Library'
    })
  }
})

test('rejects unknown organizations, other slugs, and non-partner plans', async () => {
  for (const organizations of [
    [],
    [{ slug: 'other', name: 'Other', plan: 'supporter' }],
    [{ slug: 'nypl', name: 'New York Public Library', plan: null }],
    [{ slug: 'nypl', name: 'New York Public Library', plan: 'contributor' }]
  ]) {
    await assert.rejects(
      fetchPartnerOrganization(
        async () => Response.json(organizations),
        'https://api.example.org',
        'nypl'
      ),
      { status: 404 }
    )
  }
})

test('reports API failures separately from unknown organizations', async () => {
  for (const response of [
    new Response(null, { status: 503 }),
    Response.json({ error: 'Invalid data' })
  ]) {
    await assert.rejects(
      fetchPartnerOrganization(
        async () => response,
        'https://api.example.org',
        'nypl'
      ),
      { status: 502 }
    )
  }
})

test('a stalled API lookup returns a timeout instead of blocking the page', async (context) => {
  const controller = new AbortController()
  context.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
    assert.equal(milliseconds, 10_000)
    return controller.signal
  })

  const lookup = fetchPartnerOrganization(
    async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason)
        )
      }),
    'https://api.example.org',
    'hallo'
  )
  controller.abort(new DOMException('Request timed out', 'TimeoutError'))

  await assert.rejects(lookup, {
    status: 504,
    body: { message: 'Organization lookup timed out. Please try again.' }
  })
})

test('network errors produce an API error page', async () => {
  await assert.rejects(
    fetchPartnerOrganization(
      async () => {
        throw new TypeError('fetch failed')
      },
      'https://api.example.org',
      'hallo'
    ),
    { status: 502 }
  )
})
