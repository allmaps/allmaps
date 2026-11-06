import { describe, expect, test } from 'vitest'
import { createMaskedMap } from '../src/lib/masked-map.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

const annotationUrl = 'https://example.org/maps/test'
const map: GeoreferencedMap = {
  type: 'GeoreferencedMap',
  resource: {
    id: 'https://example.org/iiif/image',
    type: 'ImageService2',
    width: 2000,
    height: 1500
  },
  gcps: [],
  resourceMask: [
    [300, 200],
    [800, 200],
    [650, 600],
    [300, 600]
  ]
}

describe('masked map geometry', () => {
  test('keeps an offset, irregular mask aligned with the full source image', () => {
    const result = createMaskedMap(map, annotationUrl)
    const points = result.polygonPoints
      .split(' ')
      .map((point) => point.split(',').map(Number))

    // The image and mask must agree at every original source coordinate.
    for (const [index, [x, y]] of map.resourceMask.entries()) {
      expect(points[index]).toEqual([
        result.imageX + (x / 2000) * result.imageWidth,
        result.imageY + (y / 1500) * result.imageHeight
      ])
      expect(points[index][0]).toBeGreaterThan(0)
      expect(points[index][0]).toBeLessThan(result.width)
      expect(points[index][1]).toBeGreaterThan(0)
      expect(points[index][1]).toBeLessThan(result.height)
    }
    expect(result.width).toBe(1032)
    expect(result.height).toBe(832)
  })

  test('supports an alternate IIIF host without changing the mask', () => {
    const result = createMaskedMap(
      map,
      annotationUrl,
      'https://alternate.org/iiif/'
    )
    expect(result.imageUrl).toBe(
      'https://alternate.org/iiif/full/640,/0/default.jpg'
    )
    expect(result.polygonPoints).toBe(
      createMaskedMap(map, annotationUrl).polygonPoints
    )
  })

  test('reduces preview resolution without changing image and mask alignment', () => {
    const result = createMaskedMap(map, annotationUrl, undefined, {
      maxWidth: 600
    })
    const original = createMaskedMap(map, annotationUrl)
    expect(result.imageUrl).toBe(
      'https://example.org/iiif/image/full/600,/0/default.jpg'
    )
    expect(result.imageClipPath).toBe(original.imageClipPath)
    expect(result.polygonPoints).toBe(original.polygonPoints)
    expect(result.imageWidth).toBe(original.imageWidth)
    expect(result.imageHeight).toBe(original.imageHeight)
    expect(result.imageX).toBe(original.imageX)
    expect(result.imageY).toBe(original.imageY)
  })

  test('clips the HTML image at the same source coordinates as the SVG outline', () => {
    expect(createMaskedMap(map, annotationUrl).imageClipPath).toBe(
      'polygon(15% 13.333333333333334%, 40% 13.333333333333334%, 32.5% 40%, 15% 40%)'
    )
  })

  test('rejects missing image dimensions instead of guessing from mask vertices', () => {
    expect(() =>
      createMaskedMap(
        { ...map, resource: { ...map.resource, width: undefined } },
        annotationUrl
      )
    ).toThrow('Missing image dimensions')
  })

  test('rejects a zero-area mask', () => {
    expect(() =>
      createMaskedMap(
        {
          ...map,
          resourceMask: [
            [300, 200],
            [300, 300],
            [300, 600]
          ]
        },
        annotationUrl
      )
    ).toThrow('Empty resource mask')
  })
})
