import { expect, test } from 'vitest'

import {
  getLegacyRedirect,
  legacyPathnames
} from '../src/lib/legacy-redirects.js'

const docsBaseUrl = 'https://docs.allmaps.org/'

test.each([
  ['/getting-started', '/get-started'],
  ['/getting-started/', '/get-started'],
  ['/introduction', '/about'],
  ['/core-principles', '/about'],
  ['/timeline', '/about'],
  ['/guides/sustainability', '/faq#what-about-sustainability'],
  ['/docs/introduction', 'https://docs.allmaps.org/'],
  ['/docs/packages/transform/', 'https://docs.allmaps.org/packages/transform'],
  [
    '/guides/finding-maps',
    'https://docs.allmaps.org/guides/find-maps-to-georeference'
  ]
])('redirects %s to %s', (pathname, destination) => {
  expect(getLegacyRedirect(pathname, docsBaseUrl)).toBe(destination)
})

test('uses the configured docs environment', () => {
  expect(getLegacyRedirect('/docs/packages', 'http://localhost:5517')).toBe(
    'http://localhost:5517/packages'
  )
})

test('every prerender entry has a destination', () => {
  for (const pathname of legacyPathnames) {
    expect(getLegacyRedirect(pathname, docsBaseUrl)).toBeDefined()
  }
})

test.each(['/missing', '/get-started', '/toString', '//example.org'])(
  'leaves unknown and current paths alone: %s',
  (pathname) => {
    expect(getLegacyRedirect(pathname, docsBaseUrl)).toBeUndefined()
  }
)
