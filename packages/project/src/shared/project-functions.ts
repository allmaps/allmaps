import proj4 from 'proj4'

import { defaultGcpTransformerOptions } from '@allmaps/transform'

import type {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from './types'

const lonLatEquivalentDefinitions = [
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees',
  '+proj=longlat +datum=WGS84 +no_defs +type=crs',
  'EPSG:4326',
  'WGS84'
]

const webMercatorEquivalentDefinitions = [
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs',
  'EPSG:3857',
  'EPSG:3785',
  'GOOGLE',
  'EPSG:900913',
  'EPSG:102113'
]

export const lonLatProjection: Projection = {
  name: 'EPSG:4326',
  definition: lonLatEquivalentDefinitions[0]
}
export const webMercatorProjection: Projection = {
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

function projectionToAntialiasedDefinition(projection: Projection | undefined) {
  if (projection === undefined) {
    return undefined
  }

  const lonLatIndex = lonLatEquivalentDefinitions.indexOf(projection.definition)
  const webMercatorIndex = webMercatorEquivalentDefinitions.indexOf(
    projection.definition
  )
  if (lonLatIndex != -1) {
    return lonLatProjection.definition
  } else if (webMercatorIndex != -1) {
    return webMercatorProjection.definition
  } else {
    return projection.definition
  }
}

export function isEqualProjection(
  projection0: Projection | undefined,
  projection1: Projection | undefined
) {
  return (
    projectionToAntialiasedDefinition(projection0) ==
    projectionToAntialiasedDefinition(projection1)
  )
}
