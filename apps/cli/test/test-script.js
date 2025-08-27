import { describe, it } from 'mocha'
import { expect } from 'chai'

import { readFile } from './lib/fs.js'
import { execFilename } from './lib/exec.js'

describe('allmaps script', () => {
  it('should produce the correct gdal script', () => {
    const expected = readFile('output/scripts/c969e4bba21381cf.sh')
    const output = execFilename(
      'script geotiff',
      'input/annotations/c969e4bba21381cf.json'
    )
    expect(expected).to.deep.equal(output)
  })

  it('should produce the correct gdal script, taking internal projection into account', () => {
    const expected = readFile(
      'output/scripts/c969e4bba21381cf-internal-projection.sh'
    )
    const output = execFilename(
      'script geotiff --internal-projection \'PROJCS["ETRS89 / EPSG Arctic zone 3-11",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6258"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4258"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",78.7073375277778],PARAMETER["central_meridian",21],PARAMETER["standard_parallel_1",80.3333333333333],PARAMETER["standard_parallel_2",77],PARAMETER["false_easting",11500000],PARAMETER["false_northing",3500000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","6070"]]\'',
      'input/annotations/c969e4bba21381cf.json'
    )
    expect(expected).to.deep.equal(output)
  })

  it('should produce the correct gdal script, taking projection into account', () => {
    const expected = readFile('output/scripts/c969e4bba21381cf-projection.sh')
    const output = execFilename(
      'script geotiff --projection \'PROJCS["ETRS89 / EPSG Arctic zone 3-11",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6258"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4258"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["latitude_of_origin",78.7073375277778],PARAMETER["central_meridian",21],PARAMETER["standard_parallel_1",80.3333333333333],PARAMETER["standard_parallel_2",77],PARAMETER["false_easting",11500000],PARAMETER["false_northing",3500000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","6070"]]\'',
      'input/annotations/c969e4bba21381cf.json'
    )
    expect(expected).to.deep.equal(output)
  })

  it('should produce the correct gdal script, with options like transformation type overwriting map options', () => {
    const expected = readFile('output/scripts/c969e4bba21381cf-tps.sh')
    const output = execFilename(
      'script geotiff -t thinPlateSpline',
      'input/annotations/c969e4bba21381cf.json'
    )
    expect(expected).to.deep.equal(output)
  })

  it('should produce the correct gdal script, with options like transformation type overwriting map options, with unsupported transformation types ignored', () => {
    const expected = readFile('output/scripts/c969e4bba21381cf-helmert.sh')
    const output = execFilename(
      'script geotiff -t helmert',
      'input/annotations/c969e4bba21381cf.json'
    )
    expect(expected).to.deep.equal(output)
  })

  it('should produce the correct gdal script also for multiple maps', () => {
    const expected = readFile('output/scripts/a0d6d3379cfd9f0a.sh')
    const output = execFilename(
      'script geotiff',
      'input/annotations/a0d6d3379cfd9f0a.json'
    )
    expect(expected).to.deep.equal(output)
  })
})
