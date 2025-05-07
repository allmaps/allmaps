import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Stapler } from '../dist/Stapler.js'

export const inputDir = './test/input'

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

const georeferencedMap0 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-0.json')
)

const georeferencedMap1 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-1.json')
)

const georeferencedMap2 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-2.json')
)

const georeferencedMap3 = readJSONFile(
  path.join(inputDir, 'georeferenced-map-diemer-meer-3.json')
)

describe('Should filter out the correct staples', async () => {
  it(`should not find any staples in the maps by default`, () => {
    const stapler = new Stapler([georeferencedMap0, georeferencedMap1])

    expect(stapler.staplesById.size).to.equal(0)
  })
})

describe('Should throw when less then two staple by staple ID', async () => {
  it(`should not recognise staples that occure only one`, () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [0, 0] }]

    expect(() => {
      new Stapler([georeferencedMap0, georeferencedMap1])
    }).to.throw()
  })
})

describe('Should throw when more then two staple by staple ID', async () => {
  it(`should not recognise staples that occure only one`, () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [0, 0] }]
    georeferencedMap1.rcps = [{ id: '1', resource: [0, 0] }]
    georeferencedMap2.rcps = [{ id: '1', resource: [0, 0] }]

    expect(() => {
      new Stapler([georeferencedMap0, georeferencedMap1, georeferencedMap2])
    }).to.throw()
  })
})

describe('Should filter out the correct staples', async () => {
  it(`should recognise staples with the same id`, () => {
    georeferencedMap0.rcps = [{ id: '1', resource: [0, 0] }]
    georeferencedMap1.rcps = [{ id: '1', resource: [0, 0] }]
    const stapler = new Stapler([georeferencedMap0, georeferencedMap1])

    expect(stapler.staplesById.size).to.equal(1)
  })
})
