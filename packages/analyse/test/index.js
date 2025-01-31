import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Analyser } from '../dist/index.js'
import { parseAnnotation } from '../../annotation/dist/index.js'
import { TriangulatedWarpedMap } from '../../render/dist/index.js'

export const inputDir = './test/input'

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

describe('Analyse a parsed annotation', () => {
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

    const analyser = new Analyser(triangualtedWarpedMap)

    const infos = analyser.getInfos()
    const warnings = analyser.getWarnings()
    const errors = analyser.getErrors()
    // console.log('infos', infos)
    // console.log('warnings', warnings)
    // console.log('errors', errors)
    expect(infos).to.be.of.length(1)
    expect(warnings).to.be.of.length(0)
    expect(errors).to.be.of.length(0)

    // const measures = analyser.getMeasures()
    // const distortions = analyser.getDistortions()
    // console.log('measures', measures)
    // console.log('distortion', distortions)
  })
})
