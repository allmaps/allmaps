import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Stapler } from '../dist/StapledTransformation.js'

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
    const stapler = Stapler.fromGeoreferencedMaps([
      georeferencedMap0,
      georeferencedMap1
    ])

    expect(stapler.staples.length).to.equal(0)
  })
})

describe('Should filter out the correct staples', async () => {
  it(`should recognise staples with the same id`, () => {
    georeferencedMap0.rps = [{ id: '1', resource: [0, 0] }]
    georeferencedMap1.rps = [{ id: '1', resource: [0, 0] }]
    const stapler = Stapler.fromGeoreferencedMaps([
      georeferencedMap0,
      georeferencedMap1
    ])

    console.log(stapler)

    expect(stapler.staples.length).to.equal(1)
  })
})
