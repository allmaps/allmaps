import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { generateAnnotation, type GeoreferencedMap } from '@allmaps/annotation'
import sharp from 'sharp'

import { generatePartnerPreviews } from '../scripts/generate-partner-previews.ts'
import { highlightedPartnerMaps } from '../src/lib/data/partners.js'
import { partnerPreviews } from '../src/lib/data/partner-previews.js'
import imageAssets from '../src/lib/data/image-assets.json'
import { getPartnerCrop } from '../src/lib/partner-preview.js'

const temporaryDirectories: string[] = []
const selection = {
  mapId: '0123456789abcdef',
  imageServiceUrl: 'https://example.org/iiif/image',
  previewWidth: 600,
  title: 'Test map'
}
const map: GeoreferencedMap = {
  type: 'GeoreferencedMap',
  resource: {
    id: selection.imageServiceUrl,
    type: 'ImageService2',
    width: 6000,
    height: 4060
  },
  gcps: [],
  resourceMask: [
    [300, 200],
    [5800, 200],
    [5600, 3800],
    [300, 3600]
  ]
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function temporaryApp() {
  const directory = await mkdtemp(
    join(tmpdir(), 'allmaps-partner-previews-test-')
  )
  temporaryDirectories.push(directory)
  return directory
}

async function mockSource({
  background = '#c4b599',
  annotationHeight = 4060,
  serviceHeight = 4060
} = {}) {
  const image = await sharp({
    create: { width: 600, height: 406, channels: 3, background }
  })
    .jpeg()
    .toBuffer()
  return vi.fn<typeof globalThis.fetch>(async (input) => {
    const url = String(input)
    if (url === `https://annotations.allmaps.org/maps/${selection.mapId}`) {
      return Response.json(
        generateAnnotation({
          ...map,
          resource: { ...map.resource, height: annotationHeight }
        })
      )
    }
    if (url === `${selection.imageServiceUrl}/info.json`) {
      return Response.json({
        width: 6000,
        height: serviceHeight,
        profile: ['http://iiif.io/api/image/2/level2.json', { maxArea: 270000 }]
      })
    }
    if (url === `${selection.imageServiceUrl}/full/600,/0/default.jpg`) {
      return new Response(new Uint8Array(image))
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

async function snapshot(directory: string) {
  const files = await readdir(directory, {
    recursive: true,
    withFileTypes: true
  })
  return Object.fromEntries(
    await Promise.all(
      files
        .filter((file) => file.isFile())
        .map(async (file) => {
          const path = join(file.parentPath, file.name)
          return [path, (await readFile(path)).toString('base64')]
        })
    )
  )
}

describe('generating partner previews', () => {
  test('requests the source region before resizing and does not crop it twice', async () => {
    const directory = await temporaryApp()
    const source = await mockSource()
    const region = getPartnerCrop(map, 6000, 4060)
    const regionUrl = `${selection.imageServiceUrl}/${region.left},${region.top},${region.width},${region.height}/600,/0/default.jpg`
    const image = await sharp({
      create: { width: 600, height: 333, channels: 3, background: '#c4b599' }
    })
      .jpeg()
      .toBuffer()
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, options) => {
      if (String(input) === regionUrl)
        return new Response(new Uint8Array(image))
      return source(input, options)
    })
    await generatePartnerPreviews(
      { example: { ...selection, previewRegion: true } },
      directory,
      fetch
    )
    expect(fetch.mock.calls.some(([url]) => String(url) === regionUrl)).toBe(
      true
    )
    const largest = (await readdir(join(directory, '.assets/partners'))).find(
      (filename) => filename.startsWith('example-600-')
    )!
    expect(
      await sharp(join(directory, '.assets/partners', largest)).metadata()
    ).toMatchObject({ width: 600, height: 333 })
  })

  test('uses a published preview without contacting a broken IIIF service', async () => {
    const directory = await temporaryApp()
    const source = await mockSource()
    const previewImageUrl = 'https://example.org/published-preview.jpg'
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, options) => {
      const url = String(input)
      if (url === previewImageUrl) {
        return source(
          `${selection.imageServiceUrl}/full/600,/0/default.jpg`,
          options
        )
      }
      if (url.startsWith(selection.imageServiceUrl)) {
        throw new Error('The IIIF service must not be contacted')
      }
      return source(input, options)
    })
    expect(
      await generatePartnerPreviews(
        { example: { ...selection, previewImageUrl } },
        directory,
        fetch
      )
    ).toMatchObject({ partners: 1, images: 2 })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('downloads one capped image and creates correctly sized WebPs', async () => {
    const directory = await temporaryApp()
    const fetch = await mockSource()
    const result = await generatePartnerPreviews(
      { example: selection },
      directory,
      fetch
    )
    expect(result).toMatchObject({ partners: 1, images: 2 })
    expect(fetch).toHaveBeenCalledTimes(3)
    // Generation alone must not replace the app's published data.
    await expect(
      readFile(join(directory, 'src/lib/data/partner-previews.ts'))
    ).rejects.toMatchObject({ code: 'ENOENT' })
    const plan = JSON.parse(
      await readFile(join(directory, '.assets/partners.json'), 'utf8')
    )
    expect(plan.images).toHaveLength(2)
    expect(
      plan.images.every((image: { key: string }) =>
        image.key.startsWith('images/homepage/partners/example/')
      )
    ).toBe(true)
    expect(plan.partnerPreviews).toContain(
      'https://files.allmaps.org/images/homepage/partners/example/'
    )
    const images = join(directory, '.assets/partners')
    const dimensions = await Promise.all(
      (await readdir(images)).map(async (filename) => {
        const metadata = await sharp(join(images, filename)).metadata()
        expect(metadata.format).toBe('webp')
        expect(metadata.width * metadata.height).toBeLessThanOrEqual(270000)
        return metadata.width
      })
    )
    expect(dimensions.sort((a, b) => a - b)).toEqual([320, 400])

    // Identical input produces identical assets and manifest, without timestamps.
    const before = await snapshot(directory)
    await generatePartnerPreviews({ example: selection }, directory, fetch)
    expect(await snapshot(directory)).toEqual(before)
  })

  test.each(['metadata outage', 'image timeout', 'invalid image'])(
    'preserves every saved file after %s',
    async (failure) => {
      const directory = await temporaryApp()
      const healthyFetch = await mockSource()
      await generatePartnerPreviews(
        { example: selection },
        directory,
        healthyFetch
      )
      const before = await snapshot(directory)
      const fetch: typeof globalThis.fetch = async (input, options) => {
        const url = String(input)
        if (failure === 'metadata outage' && url.endsWith('/info.json')) {
          return new Response('Unavailable', { status: 503 })
        }
        if (url.endsWith('/default.jpg')) {
          if (failure === 'image timeout')
            throw new DOMException('Timed out', 'TimeoutError')
          if (failure === 'invalid image') return new Response('Not an image')
        }
        return healthyFetch(input, options)
      }
      await expect(
        generatePartnerPreviews({ example: selection }, directory, fetch)
      ).rejects.toThrow('existing previews were preserved')
      expect(await snapshot(directory)).toEqual(before)
    }
  )

  test.each([
    { annotationHeight: 6000, serviceHeight: 4060 },
    { annotationHeight: 4060, serviceHeight: 0 }
  ])(
    'handles older or incomplete source dimensions (%j)',
    async (dimensions) => {
      const directory = await temporaryApp()
      await generatePartnerPreviews(
        { example: selection },
        directory,
        await mockSource(dimensions)
      )
      const images = join(directory, '.assets/partners')
      const largest = (await readdir(images)).find((filename) =>
        filename.startsWith('example-400-')
      )!
      expect(await sharp(join(images, largest)).metadata()).toMatchObject({
        width: 400,
        height: 222
      })
    }
  )

  test('keeps the saved set when a later download batch fails', async () => {
    const directory = await temporaryApp()
    const fetch = await mockSource()
    await generatePartnerPreviews({ example: selection }, directory, fetch)
    const before = await snapshot(directory)
    await expect(
      generatePartnerPreviews(
        {
          first: selection,
          second: selection,
          third: selection,
          unavailable: {
            ...selection,
            imageServiceUrl: 'https://unavailable.example/iiif'
          }
        },
        directory,
        fetch
      )
    ).rejects.toThrow('existing previews were preserved')
    expect(await snapshot(directory)).toEqual(before)
  })

  test('replaces changed previews and removes obsolete generated images', async () => {
    const directory = await temporaryApp()
    await generatePartnerPreviews(
      { example: selection },
      directory,
      await mockSource()
    )
    const images = join(directory, '.assets/partners')
    const before = await readdir(images)
    await generatePartnerPreviews(
      { example: selection },
      directory,
      await mockSource({ background: '#445566' })
    )
    const after = await readdir(images)
    expect(after).toHaveLength(2)
    expect(after.some((filename) => before.includes(filename))).toBe(false)
  })
})

describe('published partner previews', () => {
  test('covers every curated partner and preserves the annotation links', () => {
    const partners = Object.entries(highlightedPartnerMaps).filter(
      ([, selection]) => selection
    )
    expect(Object.keys(partnerPreviews).sort()).toEqual(
      partners.map(([slug]) => slug).sort()
    )
    for (const [slug, selection] of partners) {
      expect(
        partnerPreviews[slug as keyof typeof partnerPreviews].annotationUrl
      ).toBe(
        selection!.annotationUrl ??
          `https://annotations.allmaps.org/maps/${selection!.mapId}`
      )
    }
  })

  test('references published WebPs with accurate responsive dimensions', async () => {
    for (const preview of Object.values(partnerPreviews)) {
      // Stacked layouts use a shared 512px frame without enlarging source pixels.
      expect(preview.intrinsicWidth).toBeGreaterThanOrEqual(512)
      const sources = preview.imageSrcset.split(', ').map((source) => {
        const [url, descriptor] = source.split(' ')
        expect(url).toMatch(
          /^https:\/\/files\.allmaps\.org\/images\/homepage\/partners\//
        )
        return { url, width: Number(descriptor.slice(0, -1)) }
      })
      expect(sources.map((source) => source.url)).toContain(preview.imageUrl)
      for (const source of sources) {
        const metadata = Object.values(imageAssets).find(
          (asset) => asset.url === source.url
        )!
        expect(metadata).toBeDefined()
        expect(metadata.width).toBe(source.width)
        if (source === sources.at(-1)) {
          expect(metadata.width).toBe(preview.intrinsicWidth)
          expect(metadata.height).toBe(preview.intrinsicHeight)
        }
      }
      expect(preview.intrinsicWidth / preview.intrinsicHeight).toBeCloseTo(
        1.8,
        1
      )
      expect(preview).not.toHaveProperty('imageClipPath')
    }
  })
})
