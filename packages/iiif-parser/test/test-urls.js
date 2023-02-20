import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Image } from '../dist/index.js'

import { readJson } from './lib/fs.js'

const tests = [
  {
    filename: 'image.2.rp-A136B927DA744CD2BEA9F1A3FF2271BA.json',
    region: { x: 4096, y: 4096, width: 2330, height: 714 },
    size: { width: 292, height: 90 },
    expectedUrl:
      'https://rotterdamspubliek.nl/iiif/A136B927DA744CD2BEA9F1A3FF2271BA/4096,4096,2330,714/292,/0/default.jpg'
  },
  {
    filename: 'image.2.rp-AD0567937AFC415096DCC6E6686FE32E.json',
    region: { x: 4096, y: 0, width: 2666, height: 4096 },
    size: { width: 334, height: 512 },
    expectedUrl:
      'https://rotterdamspubliek.nl/iiif/AD0567937AFC415096DCC6E6686FE32E/4096,0,2666,4096/334,/0/default.jpg'
  }
]

for (let { filename, region, size, expectedUrl } of tests) {
  describe(`${region.x},${region.y},${region.width},${region.height}/${size.width},${size.height} thumbnail for ${filename}`, () => {
    it('should match expected URL', () => {
      const image = readJson(filename)
      const parsedImage = Image.parse(image)
      const imageRequest = { region, size }
      const imageUrl = parsedImage.getImageUrl(imageRequest)
      expect(imageUrl).to.equal(expectedUrl)
    })
  })
}
