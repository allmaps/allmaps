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

  it('should read a Georeference Annotation from the standard input and overwrite the gcps and resource id to create a new annotation, with gcp resource scaling if specified', () => {
    const expected = readFileJson(
      'output/annotations/c969e4bba21381cf-gcps.json'
    )
    const output = execJson(
      'annotation generate -g input/gcps/5ec0b645696ee9b3.txt --gcp-projection-definition "EPSG:3857" --resource-width 7632 --resource-height 5600 --gcp-resource-width 4000 --gcp-resource-height 2935 --resource-id "https://adore.ugent.be/IIIF/v3/images/archive.ugent.be%3A27157654-82C8-11E3-A7CE-5BE9D43445F2%3ADS.0" --resource-type ImageService3',
      'input/annotations/c969e4bba21381cf.json'
    )
    // TODO: consider adding 'allmaps annotation new' command to create new annotation without having to overwrite existing one.
    // TODO: add overwriting of resourceMask. The resourceMask of the annotation providing the gcps was it's full mask: "<svg width=\"7632\" height=\"5600\"><polygon points=\"0,0 0,5600 7632,5600 7632,0\" /></svg>"

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

  it("should read a Georeference Annotation from a file, apply custom GCPs from another Georeference Annotation and convert it to Allmaps' internal format", () => {
    const expected = readFileJson(
      'output/maps/7a69f9470b49a744-custom-gcps-annotation.json'
    )
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json -g input/annotations/813b0579711371e2.json'
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

  it("should read a Georeference Annotation from a file, apply custom QGIS GCPs infering their projection, and convert it to Allmaps' internal format", () => {
    const expected = readFileJson(
      'output/maps/7a69f9470b49a744-custom-gcps-resource-crs.json'
    )
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json -g input/gcps/gcps-qgis-projection.points'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read a Georeference Annotation from a file, apply custom ArcGIS CSV GCPs and convert it to Allmaps' internal format", () => {
    const expected = readFileJson(
      'output/maps/7a69f9470b49a744-custom-gcps.json'
    )
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json -g input/gcps/gcps-arcgis-csv.csv'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read a Georeference Annotation from a file, apply custom ArcGIS CSV GCPs with specified projection and convert it to Allmaps' internal format", () => {
    const expected = readFileJson(
      'output/maps/7a69f9470b49a744-custom-gcps-resource-crs.json'
    )
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json -g input/gcps/gcps-arcgis-csv-projection.csv --gcp-projection-definition \'PROJCS["ETRS89-extended / LAEA Europe",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6258"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4258"]],PROJECTION["Lambert_Azimuthal_Equal_Area"],PARAMETER["latitude_of_center",52],PARAMETER["longitude_of_center",10],PARAMETER["false_easting",4321000],PARAMETER["false_northing",3210000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","3035"]]\''
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
  it('should read a Georeference Annotation from the standard input and convert its gcps to a GDAL GCP file', () => {
    const expected = readFile('output/gcps/gcps-gdal.txt')
    const output = exec(
      'annotation gcps',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to a GDAL GCP file, with overwritable projection', () => {
    const expected = readFile('output/gcps/gcps-gdal-webmercator.txt')
    const output = exec(
      'annotation gcps --gcp-projection-definition "EPSG:3857"',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an QGIS GCP file, with overwritable projection', () => {
    const expected = readFile('output/gcps/gcps-qgis-webmercator.points')
    const output = exec(
      'annotation gcps --gcp-file-format qgis --gcp-projection-definition "EPSG:3857"',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS CSV GCP file, with overwritable projection', () => {
    const expected = readFile('output/gcps/gcps-arcgis-csv-webmercator.csv')
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-csv --gcp-projection-definition "EPSG:3857"',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS TSV GCP file', () => {
    const expected = readFile('output/gcps/gcps-arcgis-tsv.txt')
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-tsv',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS TSV GCP file, with gcp resource origin set by the options', () => {
    const expected = readFile(
      'output/gcps/gcps-arcgis-tsv-resource-origin-bottom-left.txt'
    )
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-tsv --gcp-resource-origin "bottom-left" --resource-height 10474',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS TSV GCP file, with gcp resource y axes orientation set by the options', () => {
    const expected = readFile(
      'output/gcps/gcps-arcgis-tsv-resource-y-axis-down.txt'
    )
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-tsv --gcp-resource-y-axis "down"',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS TSV GCP file, with gcp resource width and height set by the options', () => {
    const expected = readFile('output/gcps/gcps-arcgis-tsv-resource-scale.txt')
    const output = exec(
      'annotation gcps --gcp-file-format arcgis-tsv --gcp-resource-width 3000 --gcp-resource-height 9000 --resource-width 6000 --resource-height 18000',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })

  it('should read a Georeference Annotation from the standard input and convert its gcps to an ArcGIS CSV GCP file, with resourceCrs included and applied', () => {
    const expected = readFile('output/gcps/gcps-qgis-resource-crs.points')
    const output = exec(
      'annotation gcps --gcp-file-format qgis',
      'input/annotations/393a52e3e3882bc6.json'
    )

    expect(expected).to.equal(output)
  })
})
