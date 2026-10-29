import { describe, expect, it, vi } from 'vitest'
import { IIIF } from '@allmaps/iiif-parser'

import {
  fetchAnnotationsFromApi,
  getMapQueryCredentials,
  PUBLIC_API_MAX_LIMIT
} from '../src/api.js'

describe('public API reads', () => {
  it.each([1, 50, 100, PUBLIC_API_MAX_LIMIT])(
    'omits credentials for a public map limit of %s',
    (limit) => expect(getMapQueryCredentials(limit)).toBe('omit')
  )

  it.each([PUBLIC_API_MAX_LIMIT + 1, 400, 600, 0, -1, 1.5, NaN, Infinity])(
    'preserves authentication for elevated or invalid limit %s',
    (limit) => expect(getMapQueryCredentials(limit)).toBe('include')
  )

  it('fetches public image annotations without credentials through the supplied fetch', async () => {
    const image = IIIF.parse({
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': 'https://example.org/iiif/image',
      protocol: 'http://iiif.io/api/image',
      width: 1000,
      height: 800,
      profile: ['http://iiif.io/api/image/2/level2.json']
    })
    const annotations = { type: 'AnnotationPage', items: [] }
    const fetch = vi.fn(async () => Response.json(annotations))
    expect(
      await fetchAnnotationsFromApi('https://annotations.example', image, fetch)
    ).toEqual(annotations)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/annotations\.example\/images\/[a-f0-9]{16}$/
      ),
      { credentials: 'omit' }
    )
  })
})
