import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { parseAnnotation } from '@allmaps/annotation'
import { WarpedMap } from '@allmaps/render'

import { Analyzer } from '../src/index.js'

export const inputDir = './test/input'

export function readJSONFile(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
}

describe('Analyzer', () => {
  test('ProtoGeoreferencedMap: no info or warnings, but constructinggeoreferencedmapfailed error', () => {
    const protoGeoreferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map.json')
    )

    const analyzer = new Analyzer(protoGeoreferencedMap)
    const analysis = analyzer.analyze()

    expect(analysis.info).to.be.of.length(0)
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors.map((error) => error.code)).to.contain(
      'constructinggeoreferencedmapfailed'
    )
  })

  test('GeoreferencedMap: no info, warnings or errors', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze()

    expect(analysis.info).to.be.of.length(0)
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })

  test('GeoreferencedMap from parsed annotation: no info, warnings or errors', () => {
    const annotation = readJSONFile(path.join(inputDir, 'annotation.json'))
    const georeferencedMaps = parseAnnotation(annotation)
    const georeferencedMap = georeferencedMaps[0]

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze()

    expect(analysis.info).to.be.of.length(0)
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })

  test('WarpedMap: no info, warnings or errors', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map.json')
    )
    const warpedMap = new WarpedMap('tempId', georeferencedMap)

    const analyzer = new Analyzer(warpedMap)

    const analysis = analyzer.analyze()

    expect(analysis.info).to.be.of.length(0)
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })

  test('Analyze codes passed in Analyzer constructor', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskequalsfullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap, {
      codes: ['maskequalsfullmask']
    })

    const analysis = analyzer.analyze()

    expect(analysis.info.map((info) => info.code)).to.contain(
      'maskequalsfullmask'
    )
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })

  test('Analyze codes passed in getInfo() etc.', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskequalsfullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['maskequalsfullmask']
    })

    expect(analysis.info.map((info) => info.code)).to.contain(
      'maskequalsfullmask'
    )
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })

  test('Only analyze codes passed', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskequalsfullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: []
    })

    expect(analysis.info.map((info) => info.code)).to.not.contain(
      'maskequalsfullmask'
    )
    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })
})

describe('Info', () => {
  test('maskequalsfullmask', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskequalsfullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['maskequalsfullmask']
    })

    expect(analysis.info.map((info) => info.code)).to.contain(
      'maskequalsfullmask'
    )
  })

  test('gcpresourcepointismaskpoint', () => {
    const georeferencedMap = readJSONFile(
      path.join(
        inputDir,
        'proto-georeferenced-map-gcpresourcepointismaskpoint.json'
      )
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['gcpresourcepointismaskpoint']
    })

    expect(analysis.info.map((info) => info.code)).to.contain(
      'gcpresourcepointismaskpoint'
    )
  })
})

describe('Warnings', () => {
  test('maskmissing', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-maskmissing.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['maskmissing']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'maskmissing'
    )
    expect(analysis.errors.map((error) => error.code)).to.contain(
      'constructinggeoreferencedmapfailed'
    )
  })

  test('gcpoutsidemask', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpoutsidemask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['gcpoutsidemask']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'gcpoutsidemask'
    )
  })

  test('maskpointoutsidefullmask', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskpointoutsidefullmask.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['maskpointoutsidefullmask']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'maskpointoutsidefullmask'
    )
    expect(analysis.errors).to.be.of.length(0)
  })

  test('polynomial1sheartoohigh', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-polynomial1sheartoohigh.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['polynomial1sheartoohigh']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'polynomial1sheartoohigh'
    )
    expect(analysis.errors).to.be.of.length(0)
  })

  test('destinationpolynomial1rmsetoohigh', () => {
    const georeferencedMap = readJSONFile(
      path.join(
        inputDir,
        'georeferenced-map-destinationpolynomial1rmsetoohigh.json'
      )
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['destinationpolynomial1rmsetoohigh']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'destinationpolynomial1rmsetoohigh'
    )
    expect(analysis.errors).to.be.of.length(0)
  })

  test('log2sigmadistortiontoohigh', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-log2sigmadistortiontoohigh.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['log2sigmadistortiontoohigh']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'log2sigmadistortiontoohigh'
    )
    expect(analysis.errors).to.be.of.length(0)
  })

  test('should not give warning code log2sigmadistortiontoohigh if passing higher/lower max values', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-log2sigmadistortiontoohigh.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['log2sigmadistortiontoohigh'],
      maxLog2sigma: 10,
      minLog2sigma: -10
    })

    expect(analysis.warnings).to.be.of.length(0)
    expect(analysis.errors).to.be.of.length(0)
  })

  test('twoomegadistortiontoohigh', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-twoomegadistortiontoohigh.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({
      codes: ['twoomegadistortiontoohigh']
    })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'twoomegadistortiontoohigh'
    )
    expect(analysis.errors).to.be.of.length(0)
  })

  test('triangulationfoldsover', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-triangulationfoldsover.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze({ codes: ['triangulationfoldsover'] })

    expect(analysis.warnings.map((warning) => warning.code)).to.contain(
      'triangulationfoldsover'
    )
    expect(analysis.errors).to.be.of.length(0)
  })
})

describe('Errors', () => {
  test('constructinggeoreferencedmapfailed', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpsmissing.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze()

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'constructinggeoreferencedmapfailed'
    )
  })

  test('constructingtriangulatedwarpedmapfailed', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-maskselfintersection.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze()

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'maskselfintersection'
    )
  })

  test('constructingwarpedmapfailed', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map-gcpincompleteresource.json')
    )

    const analyzer = new Analyzer(georeferencedMap)
    const analysis = analyzer.analyze()

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'constructingwarpedmapfailed'
    )
  })

  test('gcpsmissing', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpsmissing.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({
      codes: ['gcpsmissing']
    })

    expect(analysis.errors.map((error) => error.code)).to.contain('gcpsmissing')
  })

  test('gcpincompleteresource', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpincompleteresource.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({
      codes: ['gcpincompleteresource']
    })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpincompleteresource'
    )
  })

  test('gcpincompletegeo', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpincompletegeo.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({
      codes: ['gcpincompletegeo']
    })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpincompletegeo'
    )
  })

  test('gcpsamountlessthen2', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpsamountlessthen2.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({ codes: ['gcpsamountlessthen2'] })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpsamountlessthen2'
    )
  })

  test('gcpsamountlessthen3', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpsamountlessthen3.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({ codes: ['gcpsamountlessthen3'] })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpsamountlessthen3'
    )
  })

  test('gcpresourcerepeatedpoint', () => {
    const georeferencedMap = readJSONFile(
      path.join(
        inputDir,
        'proto-georeferenced-map-gcpresourcerepeatedpoint.json'
      )
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({ codes: ['gcpresourcerepeatedpoint'] })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpresourcerepeatedpoint'
    )
  })

  test('gcpgeorepeatedpoint', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-gcpgeorepeatedpoint.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({ codes: ['gcpgeorepeatedpoint'] })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpgeorepeatedpoint'
    )
  })

  test('gcpsresourcenotlinearlyindependent', () => {
    const georeferencedMap = readJSONFile(
      path.join(
        inputDir,
        'proto-georeferenced-map-gcpsresourcenotlinearlyindependent.json'
      )
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({
      codes: ['gcpsresourcenotlinearlyindependent']
    })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpsresourcenotlinearlyindependent'
    )
  })

  test('gcpsgeonotlinearlyindependent', () => {
    const georeferencedMap = readJSONFile(
      path.join(
        inputDir,
        'proto-georeferenced-map-gcpsgeonotlinearlyindependent.json'
      )
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({
      codes: ['gcpsgeonotlinearlyindependent']
    })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'gcpsgeonotlinearlyindependent'
    )
  })

  test('masknotring', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-masknotring.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({ codes: ['masknotring'] })

    expect(analysis.errors.map((error) => error.code)).to.contain('masknotring')
  })

  test('maskrepeatedpoint', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-maskrepeatedpoint.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({ codes: ['maskrepeatedpoint'] })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'maskrepeatedpoint'
    )
  })

  test('maskselfintersection', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'proto-georeferenced-map-maskselfintersection.json')
    )

    const analyzer = new Analyzer(georeferencedMap)

    const analysis = analyzer.analyze({
      codes: ['maskselfintersection']
    })

    expect(analysis.errors.map((error) => error.code)).to.contain(
      'maskselfintersection'
    )
    expect(analysis.errors.map((error) => error.code)).to.contain(
      'constructinggeoreferencedmapfailed'
    )
  })
})
