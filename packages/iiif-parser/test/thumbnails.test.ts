import { describe, expect, test } from 'vitest'

import { Image } from '../src/index.js'

import { readJson } from './lib/fs.js'

const tests = [
  {
    filename: 'image.2.dighimapper-510_0713_000_00846_000_0_0001.json',
    thumbnailSize: { width: 400, height: 400 },
    expectedUrl:
      'https://images.dighimapper.eu/iiif/2/510_0713_000_00846_000_0_0001.tif/full/594,/0/default.jpg'
    // Expected size: 594 × 321
  },
  {
    filename: 'image.2.dighimapper-510_0713_000_00846_000_0_0001.json',
    thumbnailSize: { width: 200, height: 400 },
    mode: 'contain' as const,
    expectedUrl:
      'https://images.dighimapper.eu/iiif/2/510_0713_000_00846_000_0_0001.tif/full/297,/0/default.jpg'
    // Expected size: 297 × 161
  },
  {
    filename: 'image.2.dighimapper-510_0713_000_00003_000_0_0001.json',
    thumbnailSize: { width: 400, height: 400 },
    expectedUrl:
      'https://images.dighimapper.eu/iiif/2/510_0713_000_00496_000_0_0001.tif/full/304,/0/default.jpg'
    // Expected size: 304 × 557
  },
  {
    filename: 'image.2.spk-berlin-630107580-00000001.json',
    thumbnailSize: { width: 10001, height: 10001 },
    expectedUrl:
      'https://digital.iai.spk-berlin.de:443/viewer/api/v1/records/630107580/files/images/00000001.tif/full/6734,/0/default.jpg'
    // Expected size: 6734 × 9999
  },
  {
    filename: 'image.2.goudatijdmachine-51803.json',
    thumbnailSize: { width: 805, height: 677 },
    expectedUrl:
      'https://www.goudatijdmachine.nl/data/iiif/2/51803/full/800,/0/default.jpg'
    // Expected size: 800 × 674
  },
  {
    filename: 'image.2.stanford-tc010rc2373-PaloAlto3.json',
    thumbnailSize: { width: 100, height: 119 },
    expectedUrl:
      'https://stacks.stanford.edu/image/iiif/tc010rc2373/PaloAlto3/full/105,/0/default.jpg'
    // Expected size: 105 × 124
  },
  {
    filename: 'image.2.si-nasm-nasm2013-00143.json',
    thumbnailSize: { width: 400, height: 400 },
    expectedUrl:
      'https://ids.si.edu/ids/iiif/NASM-NASM2013-00143/full/400,/0/default.jpg'
    // Expected size: 400 × 579
  },
  {
    filename: 'image.3.uvacreate-mmph-wae681.json',
    thumbnailSize: { width: 400, height: 400 },
    expectedUrl:
      'https://uvacreate.gitlab.io/freedom-of-the-streets/iiif-level0-maps/iiif/mmph_wae681/full/500,372/0/default.jpg'
  }
]

for (const { filename, thumbnailSize, mode, expectedUrl } of tests) {
  describe(`${thumbnailSize.width}×${thumbnailSize.height} thumbnail for ${filename}`, () => {
    test('should match expected URL', () => {
      const image = readJson(filename)
      const parsedImage = Image.parse(image)
      const imageRequest = parsedImage.getImageRequest(thumbnailSize, mode)

      expect(Array.isArray(imageRequest)).toBe(false)
      if (!Array.isArray(imageRequest)) {
        const imageUrl = parsedImage.getImageUrl(imageRequest)
        expect(imageUrl).to.equal(expectedUrl)
      }
    })
  })
}

test('Welsh library thumbnails respect limits despite oversized advertised sizes', () => {
  // Metadata from https://iiif.llyfrgell.cymru/iiif/4997844/info.json
  const image = Image.parse({
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': 'https://iiif.llyfrgell.cymru/iiif/04/997/04997844.jp2',
    protocol: 'http://iiif.io/api/image',
    width: 21391,
    height: 19075,
    sizes: [
      { width: 167, height: 149 },
      { width: 334, height: 298 },
      { width: 668, height: 596 },
      { width: 1336, height: 1192 },
      { width: 2673, height: 2384 }
    ],
    profile: [
      'http://iiif.io/api/image/2/level1.json',
      { maxWidth: 1200, maxHeight: 1200 }
    ]
  })

  const request = image.getImageRequest({ width: 1200, height: 1200 })
  assertSingleImageRequest(request)
  expect(request.size).toEqual({ width: 1200, height: 1070 })
  expect(image.getImageUrl(request)).toBe(
    'https://iiif.llyfrgell.cymru/iiif/04/997/04997844.jp2/full/1200,/0/default.jpg'
  )
})

test.each([{ maxWidth: 1000 }, { maxHeight: 1000 }, { maxArea: 1000000 }])(
  'advertised sizes respect %o',
  (limits) => {
    const image = Image.parse({
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': 'https://example.org/image',
      protocol: 'http://iiif.io/api/image',
      width: 4000,
      height: 4000,
      sizes: [
        { width: 1100, height: 1100 },
        { width: 900, height: 900 }
      ],
      profile: ['http://iiif.io/api/image/2/level1.json', limits]
    })

    const request = image.getImageRequest({ width: 1000, height: 1000 })
    assertSingleImageRequest(request)
    expect(request.size).toEqual({ width: 900, height: 900 })
    expect(() => image.getImageUrl(request)).not.toThrow()
  }
)

function assertSingleImageRequest(
  request: ReturnType<Image['getImageRequest']>
): asserts request is Exclude<typeof request, unknown[]> {
  expect(Array.isArray(request)).toBe(false)
  if (Array.isArray(request)) throw new Error('Expected a single image request')
}
