import { describe, expect, test } from 'vitest'

import { Collection } from '../src/index.js'

const thumbnailUrl = 'https://example.org/image/full/256,/0/default.jpg'
const thumbnail = {
  '@id': thumbnailUrl,
  '@type': 'dctypes:Image',
  format: 'image/jpeg',
  width: 256,
  height: 192
}
const expectedThumbnail = {
  id: thumbnailUrl,
  type: 'dctypes:Image',
  format: 'image/jpeg',
  width: 256,
  height: 192
}

describe('Parsing thumbnails on embedded Presentation 2 manifests', () => {
  test.each([
    {
      name: 'an image object',
      thumbnail,
      expected: [expectedThumbnail]
    },
    {
      name: 'an image URL',
      thumbnail: thumbnailUrl,
      expected: [{ id: thumbnailUrl }]
    },
    {
      name: 'multiple thumbnails',
      thumbnail: [thumbnail, 'https://example.org/alternative.jpg'],
      expected: [
        expectedThumbnail,
        { id: 'https://example.org/alternative.jpg' }
      ]
    },
    {
      name: 'no thumbnail',
      thumbnail: undefined,
      expected: undefined
    }
  ])('should preserve $name', ({ thumbnail, expected }) => {
    const collection = Collection.parse({
      '@id': 'https://example.org/collection',
      '@type': 'sc:Collection',
      manifests: [
        {
          '@id': 'https://example.org/manifest',
          '@type': 'sc:Manifest',
          label: 'Map',
          thumbnail
        }
      ]
    })

    expect(collection.items[0].thumbnail).toEqual(expected)
  })
})
