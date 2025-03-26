import fs from 'fs'
import path from 'path'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import { Analyzer } from '../dist/index.js'
import { parseAnnotation } from '../../annotation/dist/index.js'

export const inputDir = './test/input'

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}

describe('Analyze a parsed annotation', () => {
  it('should run and give no info, errors or warnings', () => {
    const annotation = readJSONFile(path.join(inputDir, 'annotation.json'))
    const georeferencedMaps = parseAnnotation(annotation)
    const georeferencedMap = georeferencedMaps[0]

    const analyzer = new Analyzer(georeferencedMap)

    const info = analyzer.getInfo()
    const warnings = analyzer.getWarnings()
    const errors = analyzer.getErrors()

    const infoCodes = info.map((i) => i.code)
    const warningCodes = warnings.map((i) => i.code)
    const errorCodes = errors.map((i) => i.code)

    expect(infoCodes).to.be.of.length(0)
    expect(warningCodes).to.be.of.length(0)
    expect(errorCodes).to.be.of.length(0)

    // const measures = analyzer.getMeasures()
    // const distortions = analyzer.getDistortions()
  })
})

describe('Analyze a georeferenced map', () => {
  it('should run and give no info, errors or warnings', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const info = analyzer.getInfo()
    const warnings = analyzer.getWarnings()
    const errors = analyzer.getErrors()

    const infoCodes = info.map((i) => i.code)
    const warningCodes = warnings.map((i) => i.code)
    const errorCodes = errors.map((i) => i.code)

    expect(infoCodes).to.be.of.length(0)
    expect(warningCodes).to.be.of.length(0)
    expect(errorCodes).to.be.of.length(0)

    // const measures = analyzer.getMeasures()
    // const distortions = analyzer.getDistortions()
  })
})

describe('Analyze a georeferenced map with maskequalsfullmask', () => {
  it('should give info code maskequalsfullmask', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskequalsfullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const info = analyzer.getInfo({
      codes: ['maskequalsfullmask']
    })
    const warnings = analyzer.getWarnings()
    const errors = analyzer.getErrors()

    const infoCodes = info.map((i) => i.code)
    const warningCodes = warnings.map((i) => i.code)
    const errorCodes = errors.map((i) => i.code)

    expect(infoCodes).to.contain('maskequalsfullmask')
    expect(warningCodes).to.be.of.length(0)
    expect(errorCodes).to.be.of.length(0)
  })
})

describe('Analyze a georeferenced map with gcpoutsidemask', () => {
  it('should give warning code gcpoutsidemask', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-gcpoutsidemask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const warnings = analyzer.getWarnings({
      codes: ['gcpoutsidemask']
    })
    const errors = analyzer.getErrors()

    const warningCodes = warnings.map((i) => i.code)
    const errorCodes = errors.map((i) => i.code)

    expect(warningCodes).to.contain('gcpoutsidemask')
    expect(errorCodes).to.be.of.length(0)
  })
})

describe('Analyze a georeferenced map with maskpointoutsidefullmask', () => {
  it('should give warning code maskpointoutsidefullmask', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskpointoutsidefullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const warnings = analyzer.getWarnings({
      codes: ['maskpointoutsidefullmask']
    })
    const errors = analyzer.getErrors()

    const warningCodes = warnings.map((i) => i.code)
    const errorCodes = errors.map((i) => i.code)

    expect(warningCodes).to.contain('maskpointoutsidefullmask')
    expect(errorCodes).to.be.of.length(0)
  })
})

// describe('Analyze a georeferenced map with triangulationfoldsover', () => {
//   it('should give warning code triangulationfoldsover', () => {
//     const georeferencedMap = readJSONFile(
//       path.join(inputDir, 'georeferenced-map-triangulationfoldsover.json')
//     )

//     const analyzer = new Analyzer(georeferencedMap)

//     const warnings = analyzer.getWarnings({ codes: ['triangulationfoldsover'] })
//     const errors = analyzer.getErrors()

//     const warningCodes = warnings.map((i) => i.code)
//     const errorCodes = errors.map((i) => i.code)

//     expect(warningCodes).to.contain('triangulationfoldsover')
//     expect(errorCodes).to.be.of.length(0)
//   })
// })

describe('Analyze a georeferenced map with polynomialsheartoohigh', () => {
  it('should give warning code polynomialsheartoohigh', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-polynomialsheartoohigh.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const warnings = analyzer.getWarnings({ codes: ['polynomialsheartoohigh'] })
    const errors = analyzer.getErrors()

    const warningCodes = warnings.map((i) => i.code)
    const errorCodes = errors.map((i) => i.code)

    expect(warningCodes).to.contain('polynomialsheartoohigh')
    expect(errorCodes).to.be.of.length(0)
  })
})

describe('Analyze a georeferenced map with gcpincompleteresource', () => {
  it('should give error code gcpincompleteresource and constructingwarpedmapfailed', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-gcpincompleteresource.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({
      codes: ['gcpincompleteresource', 'constructingwarpedmapfailed']
    })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('gcpincompleteresource')
    expect(errorCodes).to.contain('constructingwarpedmapfailed')
  })
})

describe('Analyze a georeferenced map with gcpamountlessthen2', () => {
  it('should give error code gcpamountlessthen2', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-gcpamountlessthen2.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({ codes: ['gcpamountlessthen2'] })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('gcpamountlessthen2')
  })
})

describe('Analyze a georeferenced map with gcpamountlessthen3', () => {
  it('should give error code gcpamountlessthen3', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-gcpamountlessthen3.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({ codes: ['gcpamountlessthen3'] })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('gcpamountlessthen3')
  })
})

describe('Analyze a georeferenced map with gcpresourcerepeatedpoint', () => {
  it('should give error code gcpresourcerepeatedpoint', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-gcpresourcerepeatedpoint.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({ codes: ['gcpresourcerepeatedpoint'] })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('gcpresourcerepeatedpoint')
  })
})

describe('Analyze a georeferenced map with masknotring', () => {
  it('should give error code masknotring', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-masknotring.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({ codes: ['masknotring'] })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('masknotring')
  })
})

describe('Analyze a georeferenced map with maskrepeatedpoint', () => {
  it('should give error code maskrepeatedpoint', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskrepeatedpoint.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({ codes: ['maskrepeatedpoint'] })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('maskrepeatedpoint')
  })
})

describe('Analyze a georeferenced map with maskselfintersection', () => {
  it('should give error code maskselfintersection and constructingtriangulatedwarpedmapfailed', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskselfintersection.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const errors = analyzer.getErrors({
      codes: ['constructingtriangulatedwarpedmapfailed', 'maskselfintersection']
    })

    const errorCodes = errors.map((i) => i.code)

    expect(errorCodes).to.contain('constructingtriangulatedwarpedmapfailed')
    expect(errorCodes).to.contain('maskselfintersection')
  })
})
