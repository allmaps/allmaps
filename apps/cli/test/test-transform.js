import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import roughly from 'chai-roughly'

import { readFile, readFileJson } from './lib/fs.js'
import { exec, execJson } from './lib/exec.js'
import { helpMessage } from './lib/help.js'

chai.use(roughly)

describe('allmaps transform', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform')).to.throw(helpMessage('transform'))
  })
})

describe('allmaps transform svg', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform svg')).to.throw(helpMessage('transform-svg'))
  })

  // with -a, but no file
  // with -a, but multiple maps

  it('should read an SVG polygon from a filename and transform this SVG to GeoJSON using the supplied Georeference Annotation', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-polygon.geojson'
    )
    const output = execJson(
      'transform svg -a input/annotations/7a69f9470b49a744.json',
      'input/svg/polygon.svg'
    )
    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read an SVG polyline from a filename and transform this SVG to GeoJSON using the supplied Georeference Annotation', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-polylines.geojson'
    )
    const output = execJson(
      'transform svg -a input/annotations/7a69f9470b49a744.json',
      'input/svg/polylines.svg'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })
})

describe('allmaps transform geojson', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform geojson')).to.throw(
      helpMessage('transform-geojson')
    )
  })

  it('should read a GeoJSON Polygon from a filename and transform this to an SVG using the supplied Georeference Annotation', () => {
    const expected = readFile('output/svg/26e384d4efabdb32-line.svg')
    const output = exec(
      'transform geojson -a input/maps/26e384d4efabdb32.json',
      'input/geojson/26e384d4efabdb32-linestring.geojson'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })
})

describe('allmaps transform resource-mask', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform resource-mask')).to.throw(
      helpMessage('transform-resource-mask')
    )
  })

  it('should read a map from standard input and transform its resource mask to GeoJSON', () => {
    const expected = readFileJson('output/geojson/26e384d4efabdb32.geojson')
    const output = execJson(
      'transform resource-mask',
      'input/maps/26e384d4efabdb32.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read two Georeference Annotations from standard input and transform their resource masks to GeoJSON', () => {
    const expected = readFileJson('output/geojson/combined.geojson')
    const output = execJson(
      'transform resource-mask',
      'input/annotations/combined.combined-json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a map from a filename and transform its resource mask to GeoJSON', () => {
    const expected = readFileJson('output/geojson/26e384d4efabdb32.geojson')
    const output = execJson(
      'transform resource-mask input/maps/26e384d4efabdb32.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a map from two filenames and transform their resource masks to GeoJSON', () => {
    const expected = readFileJson(
      'output/geojson/26e384d4efabdb32-5610333850638ae2.geojson'
    )
    const output = execJson(
      'transform resource-mask input/maps/26e384d4efabdb32.json input/maps/5610333850638ae2.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation from a filename and transform its resource mask to GeoJSON, using the default transform options', () => {
    const expected = readFileJson('output/geojson/13fd7a1921f2b011-d0.geojson')
    const output = execJson(
      'transform resource-mask input/annotations/13fd7a1921f2b011.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation from a filename and transform its resource mask to GeoJSON, using the custom transform options', () => {
    const expected = readFileJson('output/geojson/13fd7a1921f2b011-d8.geojson')
    const output = execJson(
      'transform resource-mask -p 0.01 -d 8 input/annotations/13fd7a1921f2b011.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation from a filename and transform its resource mask to GeoJSON, using the default transform options', () => {
    const expected = readFileJson('output/geojson/7a69f9470b49a744.geojson')
    const output = execJson(
      'transform resource-mask input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation with a reversed resource mask from a filename and transform its resource mask to GeoJSON, using the default transform options', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-reversed-resource-mask.geojson'
    )
    const output = execJson(
      'transform resource-mask input/annotations/7a69f9470b49a744-reversed-resource-mask.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })
})
