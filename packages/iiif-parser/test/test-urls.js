import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Image } from '../dist/index.js'

import { readJson } from './lib/fs.js'

const tests = [
  {
    filename: 'image.1.gallica.bnf.12148.btv1b53243704g.f1.json',
    size: { width: 790, height: 1106 },
    expectedUrl:
      'https://gallica.bnf.fr/iiif/ark:/12148/btv1b53243704g/f1/full/790,/0/native.jpg'
  },
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
  },
  {
    filename: 'image.3.uvacreate-mmph-wae681.json',
    region: { x: 0, y: 0, width: 128, height: 128 },
    size: { width: 128, height: 128 },
    expectedUrl:
      'https://uvacreate.gitlab.io/freedom-of-the-streets/iiif-level0-maps/iiif/mmph_wae681/0,0,128,128/128,/0/default.jpg'
  },
  {
    filename: 'image.2.sfo-176-270-383-1.json',
    region: { x: 1536, y: 0, width: 162, height: 256 },
    size: { width: 162, height: 256 },
    expectedUrl:
      'https://static.sfomuseum.org/media/176/270/383/1/tiles/1536,0,162,256/162,/0/default.jpg'
  }
]

for (let { filename, region, size, expectedUrl } of tests) {
  let regionStr = 'full'
  if (region) {
    regionStr = `${region.x},${region.y},${region.width},${region.height}`
  }

  let sizeStr = 'full'
  if (size) {
    sizeStr = `${size.width},${size.height}`
  }

  describe(`${regionStr}/${sizeStr} thumbnail for ${filename}`, () => {
    it('should match expected URL', () => {
      const image = readJson(filename)
      const parsedImage = Image.parse(image)
      const imageRequest = { region, size }
      const imageUrl = parsedImage.getImageUrl(imageRequest)
      expect(imageUrl).to.equal(expectedUrl)
    })
  })
}
