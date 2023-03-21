import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { createTransformer, toGeoJSONPolygon } from '../dist/index.js'

chai.use(shallowDeepEqual)

const inputDir = './test/input'
const outputDir = './test/output'

fs.readdirSync(inputDir)
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => {
    const basename = path.basename(filename, '.json')

    const inputFilename = path.join(inputDir, `${basename}.json`)
    const geojsonFilename = path.join(outputDir, `${basename}.geojson`)
    const errorFilename = path.join(outputDir, `${basename}.error.json`)

    return {
      basename,
      map: readJSONFile(inputFilename),
      geojson: readJSONFile(geojsonFilename),
      error: readJSONFile(errorFilename)
    }
  })
  .forEach(runTests)

function readJSONFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename))
  } catch (err) {
    return undefined
  }
}

function runTests(file) {
  describe(`Parsing ${file.basename}`, () => {
    const hasGeoJSONFile = file.geojson !== undefined
    const hasErrorFile = file.error !== undefined

    it('should have either a associated GeoJSON file or a associated error file', () => {
      expect(
        (hasGeoJSONFile || hasErrorFile) && !(hasGeoJSONFile && hasErrorFile)
      ).to.equal(true)
    })

    const transformer = createTransformer(file.map.gcps)
    let geojson
    let error

    try {
      geojson = toGeoJSONPolygon(transformer, file.map.pixelMask)
    } catch (err) {
      error = err.message
    }

    if (hasGeoJSONFile) {
      it('pixelMask should transform to a correct GeoJSON', () => {
        expect(file.geojson).to.shallowDeepEqual(geojson)
      })
    } else if (hasErrorFile) {
      it('error message should be correct', () => {
        expect(file.error).to.equal(error)
      })
    }
  })
}
