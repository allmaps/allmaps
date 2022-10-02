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
      'https://images.dighimapper.eu/iiif/2/510_0713_000_00846_000_0_0001.tif/full/594,321/0/default.jpg'
  },
  {
    filename: 'image.2.dighimapper-510_0713_000_00846_000_0_0001.json',
    thumbnailSize: { width: 200, height: 400 },
    mode: 'contain',
    expectedUrl:
      'https://images.dighimapper.eu/iiif/2/510_0713_000_00846_000_0_0001.tif/full/297,161/0/default.jpg'
  },
  {
    filename: 'image.2.spk-berlin-630107580-00000001.json',
    thumbnailSize: { width: 10001, height: 10001 },
    expectedUrl:
      'https://digital.iai.spk-berlin.de:443/viewer/api/v1/records/630107580/files/images/00000001.tif/full/6734,10000/0/default.jpg'
  },
  {
    filename: 'image.2.toolforge-e8f0e820e00680e69939a97ffccf64e8.json',
    thumbnailSize: { width: 800, height: 800 },
    expectedUrl:
      'http://zoomviewer.toolforge.org/iipsrv.fcgi/?iiif=cache/e8f0e820e00680e69939a97ffccf64e8.tif/full/813,963/0/default.jpg'
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
