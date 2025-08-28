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
    expect(() => exec('transform svg')).to.throw(helpMessage('no-gcps'))
  })

  // with -a, but no file
  // with -a, but multiple maps

  it('should read an SVG polygon from a GDAL-like GCP file and transform this SVG to GeoJSON using the supplied Georeference Annotation, with midpoints computed geographically', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-polygon.geojson'
    )
    const output = execJson(
      'transform svg -a input/annotations/7a69f9470b49a744.json',
      'input/svg/polygon.svg'
    )
    // Checking very precisely to verify that the correct distance functions are used, via destinationIsGeographic
    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read an SVG polyline from a GDAL-like GCP file and transform this SVG to GeoJSON using the supplied Georeference Annotation, with midpoints computed geographically', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-polylines.geojson'
    )
    const output = execJson(
      'transform svg -a input/annotations/7a69f9470b49a744.json',
      'input/svg/polylines.svg'
    )
    // Checking very precisely to verify that the correct distance functions are used, via destinationIsGeographic
    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read an SVG polyline from a GDAL-like GCP file and transform this SVG to GeoJSON using the supplied Georeference Annotation, with midpoints computed geographically and using the custom transform options', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-polylines-max-depth-1.geojson'
    )
    const output = execJson(
      'transform svg -a input/annotations/7a69f9470b49a744.json --max-depth 1',
      'input/svg/polylines.svg'
    )
    // Checking very precisely to verify that the correct distance functions are used, via destinationIsGeographic
    expect(expected).to.roughly(0.0001).deep.equal(output)
  })
})

describe('allmaps transform geojson', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform geojson')).to.throw(helpMessage('no-gcps'))
  })

  it('should read a GeoJSON Polygon from a GDAL-like GCP file and transform this to an SVG using the supplied Georeference Annotation', () => {
    const expected = readFile('output/svg/26e384d4efabdb32-line.svg')
    const output = exec(
      'transform geojson -a input/maps/26e384d4efabdb32.json',
      'input/geojson/26e384d4efabdb32-linestring.geojson'
    )
    expect(expected).to.be.equal(output)
  })
})

describe('allmaps transform resource-mask', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform resource-mask')).to.throw(
      helpMessage('no-input-files')
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

  it('should read a map from a GDAL-like GCP file and transform its resource mask to GeoJSON', () => {
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

  it('should read a Georeference Annotation from a GDAL-like GCP file and transform its resource mask to GeoJSON, using the default transform options', () => {
    const expected = readFileJson('output/geojson/13fd7a1921f2b011-d0.geojson')
    const output = execJson(
      'transform resource-mask input/annotations/13fd7a1921f2b011.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation from a GDAL-like GCP file and transform its resource mask to GeoJSON, using the custom transform options', () => {
    const expected = readFileJson('output/geojson/13fd7a1921f2b011-d2.geojson')
    const output = execJson(
      'transform resource-mask --max-depth 2 input/annotations/13fd7a1921f2b011.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation from a GDAL-like GCP file and transform its resource mask to GeoJSON, using the default transform options', () => {
    const expected = readFileJson('output/geojson/7a69f9470b49a744.geojson')
    const output = execJson(
      'transform resource-mask input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })

  it('should read a Georeference Annotation with a reversed resource mask from a GDAL-like GCP file and transform its resource mask to GeoJSON, using the default transform options', () => {
    const expected = readFileJson(
      'output/geojson/7a69f9470b49a744-reversed-resource-mask.geojson'
    )
    const output = execJson(
      'transform resource-mask input/annotations/7a69f9470b49a744-reversed-resource-mask.json'
    )

    expect(expected).to.roughly(0.0001).deep.equal(output)
  })
})

describe('allmaps transform coordinates', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('transform coordinates')).to.throw(helpMessage('no-gcps'))
  })

  it('should display an error when no annotation file is provided', () => {
    expect(() => exec('transform coordinates -a')).to.throw(
      helpMessage('arguments-missing-annotation')
    )
  })

  // TODO: Add test for prompt from stdin
  // TODO: Add test for muliple input files

  it('should read coordinates from a GDAL-like GCP file and transform these coordinates toGeo using the supplied Georeference Annotation', () => {
    const expected = readFile('output/coordinates/coordinates-tps.txt')
    const output = exec(
      'transform coordinates -a input/annotations/7a69f9470b49a744.json',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a GDAL-like GCP file and transform these coordinates toResource using the supplied Georeference Annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-tps-to-resource.txt'
    )
    const output = exec(
      'transform coordinates -a input/annotations/7a69f9470b49a744.json -i',
      'input/coordinates/coordinates-to-resource.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a GDAL-like GCP file and transform these coordinates toGeo using the supplied Georeference Annotation GCPs but overwrittable transformation type', () => {
    const expected = readFile('output/coordinates/coordinates-polynomial.txt')
    const output = exec(
      'transform coordinates -a input/annotations/7a69f9470b49a744.json -t polynomial',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a GDAL-like GCP file and transform these coordinates toGeo using the supplied Georeference Annotation transformation type but overwritable GCPs', () => {
    const expected = readFile(
      'output/coordinates/coordinates-tps-other-gcps.txt'
    )
    const output = exec(
      'transform coordinates -a input/annotations/7a69f9470b49a744.json -g input/gcps/gcps-gdal.txt',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a GDAL-like GCP file and transform these coordinates toGeo using the supplied transformation type and GCPs, even without a provided annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-tps-other-gcps.txt'
    )
    const output = exec(
      'transform coordinates -g input/gcps/gcps-gdal.txt -t thinPlateSpline',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a GDAL-like GCP file and transform these coordinates toGeo using the supplied GCPs and the default transformation type, even without a provided annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-polynomial-other-gcps.txt'
    )
    const output = exec(
      'transform coordinates -g input/gcps/gcps-gdal.txt',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a QGIS-like GCP file and transform these coordinates toGeo using the supplied GCPs and the default transformation type, even without a provided annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-polynomial-other-gcps.txt'
    )
    const output = exec(
      'transform coordinates -g input/gcps/gcps-qgis.points',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates and internal projection from a QGIS-like GCP file and transform these coordinates toGeo using the supplied GCPs and the default transformation type, even without a provided annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-polynomial-other-gcps-internal-projection.txt'
    )
    const output = exec(
      'transform coordinates -g input/gcps/gcps-qgis-internal-projection.points',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a ArcGIS-CSV-like GCP file and transform these coordinates toGeo using the supplied GCPs and the default transformation type, even without a provided annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-polynomial-other-gcps.txt'
    )
    const output = exec(
      'transform coordinates -g input/gcps/gcps-arcgis-csv.csv --resource-height 7573',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })

  it('should read coordinates from a ArcGIS-TSV-like GCP file and transform these coordinates toGeo using the supplied GCPs and the default transformation type, even without a provided annotation', () => {
    const expected = readFile(
      'output/coordinates/coordinates-polynomial-other-gcps.txt'
    )
    const output = exec(
      'transform coordinates -g input/gcps/gcps-arcgis-tsv.txt --resource-height 7573',
      'input/coordinates/coordinates.txt'
    )
    expect(expected).to.equal(output)
  })
})
