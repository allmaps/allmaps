import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Analyzer } from '../dist/index.js'
import { parseAnnotation } from '../../annotation/dist/index.js'
import { TriangulatedWarpedMap } from '../../render/dist/index.js'

export const inputDir = './test/input'

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

describe('Analyze a parsed annotation', () => {
  it('should run', () => {
    const annotation = readJSONFile(
      path.join(
        inputDir,
        'annotation.1.body-transformation-thin-plate-spline.json'
      )
    )
    const georeferencedMaps = parseAnnotation(annotation)
    const georeferencedMap = georeferencedMaps[0]

    const triangualtedWarpedMap = new TriangulatedWarpedMap(
      georeferencedMap.id,
      georeferencedMap
    )

    const analyzer = new Analyzer(triangualtedWarpedMap)

    const info = analyzer.getInfo()
    const warnings = analyzer.getWarnings()
    const errors = analyzer.getErrors()
    // console.log('info', info)
    // console.log('warnings', warnings)
    // console.log('errors', errors)
    expect(info).to.be.of.length(1)
    expect(warnings).to.be.of.length(0)
    expect(errors).to.be.of.length(0)

    // const measures = analyzer.getMeasures()
    // const distortions = analyzer.getDistortions()
    // console.log('measures', measures)
    // console.log('distortion', distortions)
  })
})
