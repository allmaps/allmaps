import { describe, expect, it } from 'vitest'
import { generateTilesHtml } from '../src/lib/html.js'

describe('tile template previews', () => {
  for (const format of ['png', 'webp']) {
    for (const scope of ['maps', 'images', 'manifests']) {
      for (const retina of [false, true]) {
        it(`previews ${scope} ${format}${retina ? ' retina' : ''} using TileJSON`, async () => {
          const suffix = retina ? '@2x' : ''
          const request = new Request(
            `https://allmaps.xyz/${scope}/example/%7Bz%7D/%7Bx%7D/%7By%7D${suffix}.${format}?transformation.type=polynomial`
          )
          const response = generateTilesHtml(
            request,
            'https://tiles.allmaps.org',
            retina ? 'retina' : 'normal'
          )
          const expected = `https://allmaps.xyz/${scope}/example/tiles${suffix}.json?transformation.type=polynomial`
          expect(await response.text()).toContain(
            `https://tiles.allmaps.org/?url=${encodeURIComponent(expected)}`
          )
        })
      }
    }
  }
})
