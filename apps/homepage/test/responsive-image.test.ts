import { describe, expect, test } from 'vitest'
import {
  createImageSources,
  readImageSizeLimits
} from '../src/lib/responsive-image.js'

const serviceUrl = 'https://example.org/iiif/image'

function sourceWidths(srcset: string) {
  return srcset
    .split(', ')
    .map((source) => Number(source.match(/ (\d+)w$/)![1]))
}

describe('responsive IIIF previews', () => {
  test('respects NLS pixel limits including output rounding', () => {
    const result = createImageSources(serviceUrl, 16092, 10866, {
      maxArea: 270000
    })
    const widths = sourceWidths(result.imageSrcset)
    expect(widths).toEqual([320, 480, 632])
    for (const width of widths) {
      expect(width * Math.ceil((width * 10866) / 16092)).toBeLessThanOrEqual(
        270000
      )
    }
  })

  test.each([
    [10000, 5000],
    [5000, 10000],
    [5000, 5000]
  ])(
    'caps landscape, portrait and square previews (%i × %i)',
    (width, height) => {
      const result = createImageSources(serviceUrl, width, height)
      for (const candidate of sourceWidths(result.imageSrcset)) {
        const outputHeight = Math.ceil((candidate * height) / width)
        expect(candidate).toBeLessThanOrEqual(1280)
        expect(outputHeight).toBeLessThanOrEqual(1280)
        expect(candidate * outputHeight).toBeLessThanOrEqual(1_000_000)
      }
    }
  )

  test('respects service width and height caps together', () => {
    const result = createImageSources(serviceUrl, 2000, 1500, {
      maxWidth: 900,
      maxHeight: 300
    })
    expect(sourceWidths(result.imageSrcset)).toEqual([320, 400])
  })

  test('never upscales a small original or repeats candidates', () => {
    expect(
      sourceWidths(createImageSources(serviceUrl, 240, 160).imageSrcset)
    ).toEqual([240])
    expect(
      sourceWidths(createImageSources(serviceUrl, 640, 480).imageSrcset)
    ).toEqual([320, 480, 640])
  })

  test('reads IIIF 2 and IIIF 3 limits and ignores invalid values', () => {
    expect(
      readImageSizeLimits({
        profile: ['level2', { maxArea: 270000, maxWidth: -1 }]
      })
    ).toEqual({ maxArea: 270000 })
    expect(
      readImageSizeLimits({
        profile: 'level2',
        maxWidth: 1200,
        maxHeight: 1200,
        maxArea: 'invalid'
      })
    ).toEqual({ maxWidth: 1200, maxHeight: 1200 })
  })
})
