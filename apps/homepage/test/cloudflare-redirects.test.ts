import { expect, test } from 'vitest'
import { createCloudflareRedirects } from '../scripts/prepare-cloudflare.ts'

test('preserves local destinations and anchors with permanent redirects', () => {
  const redirects = createCloudflareRedirects('https://dev.docs.allmaps.org')
  expect(redirects).toContain('/getting-started /get-started 308\n')
  expect(redirects).toContain('/getting-started/ /get-started 308\n')
  expect(redirects).toContain(
    '/guides/sustainability /faq#what-about-sustainability 308\n'
  )
  expect(redirects).not.toContain('/*')
})

test('uses the selected documentation host without doubled slashes', () => {
  const redirects = createCloudflareRedirects('https://dev.docs.allmaps.org/')
  expect(redirects).toContain('/docs https://dev.docs.allmaps.org/ 308\n')
  expect(redirects).toContain(
    '/docs/packages/maplibre/ https://dev.docs.allmaps.org/packages/maplibre 308\n'
  )
  expect(redirects).not.toContain('https://docs.allmaps.org')
})

test('rejects local development URLs in deployment redirects', () => {
  expect(() => createCloudflareRedirects('http://localhost:5517')).toThrow(
    'HTTPS docs URL'
  )
})

test('production redirects use the live documentation hostname', () => {
  const redirects = createCloudflareRedirects('https://docs.allmaps.org')
  expect(redirects).toContain(
    '/docs/packages/maplibre https://docs.allmaps.org/packages/maplibre 308\n'
  )
  expect(redirects).not.toContain('dev.docs.allmaps.org')
})

test.each(['cli', 'tileserver'])(
  'redirects both legacy %s docs URLs to the package reference',
  (packageName) => {
    const redirects = createCloudflareRedirects('https://docs.allmaps.org')
    const destination = `https://docs.allmaps.org/packages/${packageName}`
    expect(redirects).toContain(
      `/docs/apps/${packageName} ${destination} 308\n`
    )
    expect(redirects).toContain(
      `/docs/apps/${packageName}/ ${destination} 308\n`
    )
  }
)
