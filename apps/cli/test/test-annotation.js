import { describe, it } from 'mocha'
import { expect } from 'chai'

import { exec, execJson } from './lib/exec.js'
import { readFile, readFileJson } from './lib/fs.js'
import { helpMessage } from './lib/help.js'

describe('allmaps annotation', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('annotation')).to.throw(helpMessage('annotation'))
  })

  it('should display help when incorrect command is provided', () => {
    expect(() => exec('annotation incorrect')).to.throw(
      helpMessage('annotation-incorrect')
    )
  })
})

describe('allmaps annotation generate', () => {
  it("should read georeference data in Allmaps' internal format from a file and convert it to a Georeference Annotation", () => {
    const expected = readFileJson('output/annotations/5610333850638ae2.json')
    const output = execJson(
      'annotation generate input/maps/5610333850638ae2.json'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read georeference data in Allmaps' internal format from a file, apply a custom transformation type and and convert it to a Georeference Annotation", () => {
    const expected = readFileJson(
      'output/annotations/5610333850638ae2-helmert.json'
    )
    const output = execJson(
      'annotation generate input/maps/5610333850638ae2.json -t helmert'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read georeference data in Allmaps' internal format from the standard input and convert it to a Georeference Annotation", () => {
    const expected = readFileJson('output/annotations/5610333850638ae2.json')
    const output = execJson(
      'annotation generate',
      'input/maps/5610333850638ae2.json'
    )

    expect(expected).to.deep.equal(output)
  })
})

describe('allmaps annotation parse', () => {
  it("should read a Georeference Annotation from a file and convert it to Allmaps' internal format", () => {
    const expected = readFileJson('output/maps/7a69f9470b49a744.json')
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read a Georeference Annotation from the standard input and convert it to Allmaps' internal format", () => {
    const expected = readFileJson('output/maps/7a69f9470b49a744.json')
    const output = execJson(
      'annotation parse',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read a Georeference Annotation from a file, apply custom QGIS GCPs and convert it to Allmaps' internal format", () => {
    const expected = readFileJson(
      'output/maps/7a69f9470b49a744-custom-gcps.json'
    )
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json -g input/gcps/gcps-qgis.points'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read a Georeference Annotation from a file, apply custom QGIS GCPs and convert it to Allmaps' internal format and infering their internal projection", () => {
    const expected = readFileJson(
      'output/maps/7a69f9470b49a744-custom-gcps-internal-projection.json'
    )
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json -g input/gcps/gcps-qgis-internal-projection.points'
    )

    expect(expected).to.deep.equal(output)
  })
})

describe('allmaps annotation svg', () => {
  it('should read a Georeference Annotation from the standard input and convert its resource mask to an SVG polygon', () => {
    const expected = readFile('output/svg/7a69f9470b49a744.svg')
    const output = exec(
      'annotation svg',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })
})

describe('allmaps annotation gcps', () => {
  it('should read a Georeference Annotation from the standard input and convert its gcps to an GDAL GCP file', () => {
    const expected = readFile('output/gcps/gcps-gdal.txt')
    const output = exec(
      'annotation gcps',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an GDAL GCP file, with overwritable internal projection', () => {
    const expected = readFile('output/gcps/gcps-gdal-lonlat.txt')
    const output = exec(
      'annotation gcps --internal-projection-definition "EPSG:4326"',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an QGIS GCP file', () => {
    const expected = readFile('output/gcps/gcps-qgis.points')
    const output = exec(
      'annotation gcps --gcp-file-format qgis',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS CSV GCP file, and infer the resource height from the map', () => {
    const expected = readFile('output/gcps/gcps-arcgis-csv.csv')
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-csv',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS TSV GCP file, and infer the resource height from the map', () => {
    const expected = readFile('output/gcps/gcps-arcgis-tsv.txt')
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-tsv',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })
})
