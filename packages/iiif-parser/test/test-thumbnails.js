import url from 'url'
import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Image } from '../dist/index.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'input', filename)))
}

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
    mode: 'contain',
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
    filename: 'image.2.si-NASM-NASM2013-00143.json',
    thumbnailSize: { width: 400, height: 400 },
    expectedUrl:
      'https://ids.si.edu/ids/iiif/NASM-NASM2013-00143/full/400,/0/default.jpg'
    // Expected size: 400 × 579
  }
]

for (let { filename, thumbnailSize, mode, expectedUrl } of tests) {
  describe(`${thumbnailSize.width}×${thumbnailSize.height} thumbnail for ${filename}`, () => {
    it('should match expected URL', () => {
      const image = readJson(filename)
      const parsedImage = Image.parse(image)
      const imageRequest = parsedImage.getThumbnail(thumbnailSize, mode)
      const imageUrl = parsedImage.getImageUrl(imageRequest)
      expect(imageUrl).to.equal(expectedUrl)
    })
  })
}
