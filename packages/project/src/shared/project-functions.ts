import proj4 from 'proj4'

import { defaultGcpTransformerOptions } from '@allmaps/transform'

import type {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from './types'

const lonLatEquivalents = [
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees',
  '+proj=longlat +datum=WGS84 +no_defs +type=crs',
  'EPSG:4326',
  'WGS84'
]

const webMercatorEquivalents = [
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs',
  'EPSG:3857',
  'EPSG:3785',
  'GOOGLE',
  'EPSG:900913',
  'EPSG:102113'
]

export const lonLatProjection: Projection = lonLatEquivalents[0]
export const webMercatorProjection: Projection = webMercatorEquivalents[0]

export const defaultProjectedTransformerOptions: ProjectedGcpTransformerOptions =
  {
    internalProjection: webMercatorProjection,
    projection: webMercatorProjection,
    ...defaultGcpTransformerOptions
  }

export const defaultProjectedTransformOptions: ProjectedGcpTransformOptions = {
  projection: webMercatorProjection,
  ...defaultGcpTransformerOptions
}

const lonLatProjectionToWebMecatorProjectionConverter = proj4(
  lonLatProjection,
  webMercatorProjection
)
export const lonLatToWebMercator =
  lonLatProjectionToWebMecatorProjectionConverter.forward
export const webMercatorToLonLat =
  lonLatProjectionToWebMecatorProjectionConverter.inverse

function antiAliasProjection(projection: Projection | undefined) {
  if (projection === undefined) {
    return undefined
  }

  const lonLatIndex = lonLatEquivalents.indexOf(projection)
  const webMercatorIndex = webMercatorEquivalents.indexOf(projection)
  if (lonLatIndex != -1) {
    return lonLatProjection
  } else if (webMercatorIndex != -1) {
    return webMercatorProjection
  } else {
    return projection
  }
}

export function equalProjection(
  projection0: Projection | undefined,
  projection1: Projection | undefined
) {
  return antiAliasProjection(projection0) == antiAliasProjection(projection1)
}
