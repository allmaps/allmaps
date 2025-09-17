import proj4 from 'proj4'

import { defaultGcpTransformerOptions } from '@allmaps/transform'

import type {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from './types.js'

// Note: put EPSG defintion (or WKT definition) first in the list of definitions below,
// such that other systems (like QGIS) are able to interpret the definition as a standardised CRS
// and not just a set of parameters

const lonLatEpsgDefinition = 'EPSG:4326'
const lonLatProj4StringDefinition =
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
const lonLatWktDefinition =
  'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]'
const lonLatWkt2Definition =
  'GEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble",MEMBER["World Geodetic System 1984 (Transit)"],MEMBER["World Geodetic System 1984 (G730)"],MEMBER["World Geodetic System 1984 (G873)"],MEMBER["World Geodetic System 1984 (G1150)"],MEMBER["World Geodetic System 1984 (G1674)"],MEMBER["World Geodetic System 1984 (G1762)"],MEMBER["World Geodetic System 1984 (G2139)"],MEMBER["World Geodetic System 1984 (G2296)"],ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]],ENSEMBLEACCURACY[2.0]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],CS[ellipsoidal,2],AXIS["geodetic latitude (Lat)",north,ORDER[1],ANGLEUNIT["degree",0.0174532925199433]],AXIS["geodetic longitude (Lon)",east,ORDER[2],ANGLEUNIT["degree",0.0174532925199433]],USAGE[SCOPE["Horizontal component of 3D system."],AREA["World."],BBOX[-90,-180,90,180]],ID["EPSG",4326]]'
const lonLatEquivalentDefinitions = [
  lonLatEpsgDefinition,
  lonLatProj4StringDefinition,
  lonLatWktDefinition,
  lonLatWkt2Definition,
  '+proj=longlat +datum=WGS84 +no_defs +type=crs',
  'WGS84'
]

const webMercatorEpsgDefinition = 'EPSG:3857'
const webMercatorProj4StringDefinition =
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
const webMercatorWktDefinition =
  'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs"],AUTHORITY["EPSG","3857"]]'
const webMercatorWkt2Definition =
  'PROJCRS["WGS 84 / Pseudo-Mercator",BASEGEOGCRS["WGS 84",ENSEMBLE["World Geodetic System 1984 ensemble",MEMBER["World Geodetic System 1984 (Transit)"],MEMBER["World Geodetic System 1984 (G730)"],MEMBER["World Geodetic System 1984 (G873)"],MEMBER["World Geodetic System 1984 (G1150)"],MEMBER["World Geodetic System 1984 (G1674)"],MEMBER["World Geodetic System 1984 (G1762)"],MEMBER["World Geodetic System 1984 (G2139)"],MEMBER["World Geodetic System 1984 (G2296)"],ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]],ENSEMBLEACCURACY[2.0]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4326]],CONVERSION["Popular Visualisation Pseudo-Mercator",METHOD["Popular Visualisation Pseudo Mercator",ID["EPSG",1024]],PARAMETER["Latitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8801]],PARAMETER["Longitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8802]],PARAMETER["False easting",0,LENGTHUNIT["metre",1],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1],ID["EPSG",8807]]],CS[Cartesian,2],AXIS["easting (X)",east,ORDER[1],LENGTHUNIT["metre",1]],AXIS["northing (Y)",north,ORDER[2],LENGTHUNIT["metre",1]],USAGE[SCOPE["Web mapping and visualisation."],AREA["World between 85.06°S and 85.06°N."],BBOX[-85.06,-180,85.06,180]],ID["EPSG",3857]]'
const webMercatorEquivalentDefinitions = [
  webMercatorEpsgDefinition,
  webMercatorProj4StringDefinition,
  webMercatorWktDefinition,
  webMercatorWkt2Definition,
  'EPSG:3785',
  'GOOGLE',
  'EPSG:900913',
  'EPSG:102113'
]

export const lonLatProjection: Projection<string> = {
  name: 'EPSG:4326',
  definition: lonLatEquivalentDefinitions[0]
}
export const webMercatorProjection: Projection<string> = {
  name: 'EPSG:3857',
  definition: webMercatorEquivalentDefinitions[0]
}

export const defaultProjectedGcpTransformerOptions: ProjectedGcpTransformerOptions =
  {
    internalProjection: webMercatorProjection,
    projection: webMercatorProjection,
    ...defaultGcpTransformerOptions
  }

export const defaultProjectedGcpTransformOptions: ProjectedGcpTransformOptions =
  {
    projection: webMercatorProjection,
    ...defaultGcpTransformerOptions
  }

const lonLatProjectionToWebMecatorProjectionConverter = proj4(
  lonLatProjection.definition,
  webMercatorProjection.definition
)
export const lonLatToWebMercator =
  lonLatProjectionToWebMecatorProjectionConverter.forward
export const webMercatorToLonLat =
  lonLatProjectionToWebMecatorProjectionConverter.inverse

function projectionDefinitionToAntialiasedDefinition(
  stringProjectionDefinition: string | undefined
): string | undefined {
  if (stringProjectionDefinition === undefined) {
    return undefined
  }

  const lonLatIndex = lonLatEquivalentDefinitions.indexOf(
    stringProjectionDefinition
  )
  const webMercatorIndex = webMercatorEquivalentDefinitions.indexOf(
    stringProjectionDefinition
  )
  if (lonLatIndex != -1) {
    return lonLatProjection.definition
  } else if (webMercatorIndex != -1) {
    return webMercatorProjection.definition
  } else {
    return stringProjectionDefinition
  }
}

export function isEqualProjection(
  projection0: Projection | undefined,
  projection1: Projection | undefined
): boolean | undefined {
  return (
    projectionDefinitionToAntialiasedDefinition(
      String(projection0?.definition)
    ) ==
    projectionDefinitionToAntialiasedDefinition(String(projection1?.definition))
  )
}
